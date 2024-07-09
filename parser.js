const WS = ['whitespace'];
const NL = ['newline', 'comment'];
const WS_NL = WS.concat(NL);

const MISSING = 'MISSING_VALUE';
const UNKNOWN = { kind: 'unknown' };
const is_unknown = token => token.kind === 'unknown';

const matches_or_eof = kinds => token =>
    kinds.includes(token.kind) || token.kind === 'end of file';

const exact_or_eof = value => token =>
    token.value === value || token.kind === 'end of file';

class Parser {
    lexer;
    output_err;
    constructor(text, output_err) {
        this.lexer = new Lexer(text);
        this.output_err = output_err;
    }

    errored = false;

    /**
     * `context` determines how verbose the error is.
     * context being null just prints the message.
     * context being [x, y] prints:
     *   `Error on <line> <col>: {message}, found <token>`,
     *   then x lines before the error,
     *   then the error line,
     *   then an underline under the bad token,
     *   then y lines after.
     *
     * FOOTGUN: using lexer.next() will make lexer.current_token === null
     * which makes lexer.queue_err_here() choke without a given token
     */
    queue_err_here(
        message,
        context = [3, 2],
        token = this.lexer.current_token
    ) {
        if (token === null) {
            yeet(
                'ATTEMPTED TO QUEUE ERROR WITH NULL TOKEN.\n\
                This was probably caused by using lexer.next() before lexer.queue_err_here();\n\
                Consider providing a token beforehand.'
            );
        }
        const err = { message, context, token };
        // console.trace(err);
        this.raise_err(err);
        this.errored = true;
    }

    /** converts an err command into actual text and sends it to `this.output_err` */
    raise_err(err) {
        const { message, context, token } = err;
        const { length, line, col, value } = token_info(token);

        let error_msg = '';
        if (context) {
            error_msg += `Error on line ${line}, columns ${col}-${
                col + length - 1
            }: `;
        }
        error_msg += `${message}`;
        if (context) {
            error_msg += `, found ${value}`;
            const [pre, post] = context;
            // `line` starts from 1, get_context_lines uses a 0-indexed exclusive range
            const pre_context = this.lexer.get_context_lines(
                line - pre - 1,
                line
            );
            let post_context = this.lexer.get_context_lines(line, line + post);
            if (post_context) {
                post_context = '\n' + post_context;
            }
            const highlight_arrows = ' '.repeat(col - 1) + '^'.repeat(length);
            error_msg += `\n${pre_context}\n${highlight_arrows}${post_context}`;
        }
        error_msg += '\n';
        this.output_err(error_msg);
    }

    fatal_error() {
        this.queue_err_here(
            'Parsing stopped. If I tried to continue, I would likely give unhelpful gibberish errors.',
            null
        );
        yeet('major parse error.');
    }

    /** errors if the next token is not the provided value */
    parse_exact_token(value) {
        if (this.lexer.next().value !== value) {
            panic();
        }
    }

    /**
     * errors if anything other than newline or end of file is found after whitespace.
     *
     * pass the kind of line you are trying to parse
     */
    parse_immediate_newline(line_kind) {
        if (!matches_or_eof(NL)(this.lexer.peek_after(WS))) {
            this.queue_err_here(
                'expected nothing but comments or a newline after ' + line_kind
            );
        }
        this.lexer.peek_until(['newline']);
    }

    /**
     * errors if anything other than newline or end of file is found after the current token.
     *
     * pass the kind of line you are trying to parse
     */
    parse_token_before_newline(
        line_kind,
        token_kind,
        expect_msg,
        default_value = MISSING
    ) {
        let value = default_value;
        const token = this.lexer.peek_after(WS);
        if (token.kind === token_kind) {
            value = token.value;
        } else {
            this.queue_err_here(expect_msg);
        }

        if (!matches_or_eof(WS_NL)(token)) {
            this.lexer.next();
        }
        this.parse_immediate_newline(line_kind);

        return value;
    }

    /** intended to be used when the next token is '@RULE' */
    parse_section_rule() {
        this.parse_exact_token('@RULE');
        const name = this.parse_token_before_newline(
            'rule name',
            'identifier',
            'expected rule name (identifier) after @RULE',
            'UNNAMED'
        );
        return { kind: 'rule', name };
    }

    /** err_cue is the item that signals the required punctuation, shown if not found */
    parse_punctuation(spacing, value, err_cue) {
        const token = this.lexer.peek_after(spacing);
        const found = token.value === value;
        if (!found) {
            this.queue_err_here(
                `expected ${punctuation_info(value)} after ${err_cue}`
            );
        }
        if (token.kind === 'punctuation') {
            this.lexer.next();
        }
        return found;
    }

    parse_field_colon_value(
        field_name,
        token_kind,
        expect_msg,
        default_value = MISSING
    ) {
        this.parse_exact_token(field_name);
        this.parse_punctuation(WS, ':', 'colon', field_name);
        const value = this.parse_token_before_newline(
            field_name,
            token_kind,
            expect_msg,
            default_value
        );
        return { kind: field_name, value };
    }

    /**
     * section table statement keyword:
     * use when the next token is 'neighborhood'
     */
    parse_stsk_neighborhood() {
        return this.parse_field_colon_value(
            'neighborhood',
            'neighborhood',
            'expected a neighborhood name, like margolus or square4cyclic'
        );
    }

    /**
     * section table statement keyword:
     * use when the next token is 'symmetries'
     *
     */
    parse_stsk_symmetries() {
        return this.parse_field_colon_value(
            'symmetries',
            'symmetry',
            'expected a symmetry type, like none or rot4ref (symmetries listed in documentation)'
        );
    }

    /**
     * parses a list of items that have arbitrary spacing between them,
     * and at delimiters between each element.
     *
     * @param {[string]} spacing the tokens ignored between items and delimiters
     * @param {string} delim_value the literal text of the delimiter
     * @param {string} item_name the name for a list item, shown on error
     * @param {function(): T} parse_item should consume the next item and return something for the list
     * @param {function(Token): bool} matches_list_end should return true when the next token ends the list
     * @param {bool} err_on_no_delim whether to allow a missing delimiter between 2 items
     * @param {bool} err_on_multi_delim whether to allow more than one delimiter between 2 items
     * @param {function()} on_err is called when an error happens
     * @returns {[T]}
     */
    parse_punct_delimited(
        spacing,
        delim_value,
        parse_item,
        item_name,
        matches_list_end,
        err_on_no_delim,
        err_on_multi_delim
    ) {
        let delims_in_a_row = 1;
        const items = [];
        const expecting_delim = () => err_on_no_delim && delims_in_a_row === 0;
        const err_expect = () => {
            if (expecting_delim()) {
                this.queue_err_here(
                    `expected ${punctuation_info(delim_value)}`
                );
            } else {
                this.queue_err_here(`expected ${item_name}`);
            }
        };

        // look man i don't know either
        while (true) {
            const token = this.lexer.peek_after(spacing);
            if (token.kind === 'end of file') {
                err_expect();
                break;
            }

            if (matches_list_end(token)) {
                break;
            }

            if (token.value === delim_value) {
                delims_in_a_row++;
                if (err_on_multi_delim && delims_in_a_row === 2) {
                    err_expect();
                }
                this.lexer.next();
                continue;
            }

            // at this point we have an item

            if (expecting_delim()) {
                err_expect();
                // pretend the problem doesn't exist
                delims_in_a_row = 1;
            }

            const item = parse_item();
            if (item === UNKNOWN) {
                if (spacing.includes('newline')) {
                    this.fatal_error();
                } else {
                    this.lexer.peek_until(NL);
                    return items;
                }
            }
            items.push(item);

            delims_in_a_row = 0;
        }
        return items;
    }

    /**
     * section table statement keyword var
     * use when the next token is an identifier
     */
    parse_stskv_name() {
        const token = this.lexer.peek();
        if (token.kind !== 'identifier') {
            this.queue_err_here('expected variable name (identifier)');
            return UNKNOWN;
        }
        this.lexer.next();
        return token.value;
    }

    /** use when the next token is a state number or a variable name */
    parse_value() {
        let token = this.lexer.peek();
        let item = UNKNOWN;
        switch (token.kind) {
            case 'identifier':
                item = { kind: 'var name', value: token.value };
                this.lexer.next();
                break;
            case 'number':
                item = { kind: 'state', value: parseInt(token.value) };
                this.lexer.next();
                break;
            default:
                this.queue_err_here(
                    'expected state (number) or variable name (identifier)'
                );
                break;
        }

        return item;
    }

    /**
     * section table statement keyword:
     * use when the next token is 'var'
     *
     * var a,b,c,d,e,f,g,h = { item, item, item }
     */
    parse_stsk_var() {
        this.parse_exact_token('var');

        const names = this.parse_punct_delimited(
            WS_NL,
            ',',
            () => this.parse_stskv_name(),
            'variable name (identifier)',
            exact_or_eof('='),
            true,
            true
        );
        if (!this.parse_punctuation(WS_NL, '=', 'variable name(s)')) {
            panic();
        }
        this.parse_punctuation(WS_NL, '{', punctuation_info('='));
        const values = this.parse_punct_delimited(
            WS_NL,
            ',',
            () => this.parse_value(),
            'state (number) or variable name (identifier)',
            exact_or_eof('}'),
            true,
            false
        );
        this.parse_punctuation(WS_NL, '}', 'variable values');
        this.parse_immediate_newline('variable declaration');

        return { kind: 'var def', names, values };
    }

    /**
     * section table statement:
     * parses a table statement that starts with a keyword
     */
    parse_sts_keyword() {
        switch (this.lexer.peek().value) {
            // TODO: n_states?
            case 'neighborhood':
                return this.parse_stsk_neighborhood();
            case 'symmetries':
                return this.parse_stsk_symmetries();
            case 'var':
                return this.parse_stsk_var();
            default:
                panic();
        }
    }

    /**
     * section table statement transition:
     * use when the next token is a transition item
     */
    parse_stst_item() {
        let item = this.parse_value();
        const token = this.lexer.peek();
        const index = '%^&*'.indexOf(token.value);
        if (index !== -1) {
            this.lexer.next();
            if (item !== UNKNOWN) {
                item.index = index;
            }
        }

        if (item === UNKNOWN) {
            return UNKNOWN;
        }

        return item;
    }

    /**
     * section table statement transition:
     * parses 4 items in a margolus block.
     */
    parse_stst_block(matches_list_end) {
        const start_idx = this.lexer.index;
        const start_col = this.lexer.col;
        const line = this.lexer.line;
        const block = this.parse_punct_delimited(
            WS,
            ',',
            () => this.parse_stst_item(),
            'state (number) or variable name (identifier)',
            matches_list_end,
            false,
            true
        );
        if (block === UNKNOWN) {
            return UNKNOWN;
        }
        if (block.length !== 4) {
            const end_idx = this.lexer.index;
            this.queue_err_here(
                `expected margolus block with exactly 4 items`,
                undefined,
                {
                    kind: `${block.length}-item margolus block`,
                    value: this.lexer.text.slice(start_idx, end_idx),
                    line,
                    col: start_col,
                }
            );

            return MISSING;
        }
        return block;
    }

    /** section table statement */
    parse_sts_transition() {
        const from = this.parse_stst_block(exact_or_eof(':'));
        if (from === MISSING) {
            this.queue_err_here(
                'Did you misspell symmetries or neighborhood?',
                null
            );
            this.lexer.peek_until(NL);
            return UNKNOWN;
        }
        if (from === UNKNOWN) {
            this.lexer.peek_until(NL);
            return UNKNOWN;
        }
        this.parse_punctuation(WS, ':', 'last item in block');
        const to = this.parse_stst_block(matches_or_eof(NL));
        if (to === UNKNOWN) {
            this.lexer.peek_until(NL);
            return UNKNOWN;
        }
        this.parse_immediate_newline('transition');
        return { kind: 'transition', from, to };
    }

    /** returns null when a header is found. */
    parse_section_table_statement(should_error) {
        switch (this.lexer.peek_after(WS_NL).kind) {
            case 'keyword':
                return this.parse_sts_keyword();
            case 'identifier':
            case 'number':
                return this.parse_sts_transition();
            case 'header':
            case 'end of file':
                return null;
            default:
                if (should_error) {
                    this.queue_err_here(
                        'expected a valid table statement (neighborhood, symmetries, var, transition)'
                    );
                }
                this.lexer.next();
                return UNKNOWN;
        }
    }

    /** intended to be used when the next token is '@TABLE' */
    parse_section_table() {
        this.parse_exact_token('@TABLE');
        this.parse_immediate_newline('table header');

        const statements = [];
        let should_error = true;
        while (true) {
            const statement = this.parse_section_table_statement(should_error);
            if (statement === null) {
                break;
            }
            // will not error on multiple consecutive bad tokens
            // will error only if the previous token was known
            should_error = statement !== UNKNOWN;
            statements.push(statement);
        }

        return { kind: 'table', statements };
    }

    /** lexes until a header or end of file is reached. */
    find_next_header() {
        if (!matches_or_eof(['header'])(this.lexer.peek_after(WS_NL))) {
            this.queue_err_here('expected header, such as @RULE or @TABLE');
        }
        return this.lexer.peek_until(['header']);
    }

    /** parses a section marked by an @ header */
    parse_section() {
        switch (this.find_next_header().value) {
            case '@RULE':
                return this.parse_section_rule();
            case '@TABLE':
                return this.parse_section_table();
            // TODO: maybe @COLORS
            default:
                this.queue_err_here('unrecognized header');
                this.lexer.next();
                return UNKNOWN;
        }
    }

    parse_top_level() {
        const sections = [];
        while (this.lexer.unfinished()) {
            sections.push(this.parse_section());
        }
        return {
            kind: 'file',
            sections,
        };
    }

    parse() {
        return { ast: this.parse_top_level(), errored: this.errored };
    }
}
