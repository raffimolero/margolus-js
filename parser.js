const WS = ['comment', 'whitespace'];
const WS_NL = WS.concat('newline');

class Parser {
    lexer;
    constructor(text) {
        this.lexer = new Lexer(text);
    }

    err_queue = [];

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
            throw 'ATTEMPTED TO QUEUE ERROR WITH NULL TOKEN.\n\
                This was probably caused by using lexer.next() before lexer.queue_err_here();\n\
                Consider providing a token beforehand.';
        }
        this.err_queue.push({ message, context, token });
    }

    /** converts an err command into actual text and sends it to `raise_err` */
    raise_err_with(raise_err, err) {
        const { message, context, token } = err;
        const { length, line, col, value } = this.lexer.token_info(token);

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
        raise_err(error_msg);
    }

    flush_errs(raise_err) {
        for (const err of this.err_queue) {
            this.raise_err_with(raise_err, err);
        }
        this.err_queue = [];
    }

    /**
     * errors if anything other than newline or end of file is found.
     *
     * pass the kind of line you are trying to parse
     */
    parse_newline(line_kind) {
        if (
            !['newline', 'end of file'].includes(this.lexer.peek_after(WS).kind)
        ) {
            this.queue_err_here(
                'expected nothing but comments or a newline after ' + line_kind
            );
        }
        this.lexer.peek_until(['newline']);
    }

    /** intended to be used immediately after the '@RULE' token. */
    parse_section_rule() {
        if (this.lexer.next().value !== '@RULE') {
            throw 'this function was used incorrectly.';
        }

        let name = 'UNNAMED';

        let token = this.lexer.peek_after(WS);
        switch (token.kind) {
            case 'identifier':
                name = token.value;
                this.lexer.next();
                break;
            case 'newline':
                break;
            default:
                this.queue_err_here(
                    'expected rule name (identifier) after @RULE'
                );
                this.lexer.next();
        }

        this.parse_newline('rule name');

        return { kind: 'rule', name };
    }

    /** lexes until a header or end of file is reached. */
    find_next_header() {
        if (
            this.lexer.peek_after(WS_NL).kind !== 'header' &&
            this.lexer.unfinished()
        ) {
            this.queue_err_here('expected header, such as @RULE or @TABLE');
        }
        return this.lexer.peek_until(['header']);
    }

    parse_section() {
        switch (this.find_next_header().value) {
            case '@RULE':
                return this.parse_section_rule();
            default:
                this.lexer.next();
                return { kind: 'unknown' };
        }
    }

    parse_top_level() {
        let sections = [];
        while (this.lexer.unfinished()) {
            sections.push(this.parse_section());
        }
        return {
            kind: 'file',
            sections,
        };
    }

    finish(raise_err) {
        this.lexer.finish();
        this.flush_errs(raise_err);
    }

    parse(raise_err) {
        const out = this.parse_top_level();
        this.finish(raise_err);
        return out;
    }
}
