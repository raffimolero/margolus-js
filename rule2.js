let test = `

# la;sdfjk;
#

;asdf;lj

@RULE things

@TABLE
  neighborhood   :    margolus
    symmetries   :    rotate4reflect

    # whitespace includes {=, }
    # variable elements include numbers, other variables
    # varname alone inside the set is invalid, must be & or *
    # &varname ties a variable
    # *varname expands its contents
   var a, b, c =  { ,0 ,,
    , 1
   156245 

    , 2, 3, }
var b   =   a
    var x, y, z = {2, 4, 6, 8}

a, c, d, e : r, 31, gh, el 

   
`;

test = `#

@RULE @RULE @RULE

`;

function dbg(x) {
    console.log(x);
    return x;
}

const _ = `

nl = /\r?\n/ TOKEN newline without any prior whitespace.
comment = /#.*/ + nl
ws = /\s+/ TOKEN whitespace like spaces or tabs, but not newlines.
wsn = (ws | nl)+ TOKEN whitespace like spaces, tabs, or newlines.
digit = /\d/
num = digit+ TOKEN number.
nonnum = /[A-Za-z\-_]/
alphanum = nonnum | digit

name = nonnum + alphanum* TOKEN names can only contain letters, numbers, dashes, or underscores. they cannot start with a number.

rule = @RULE + ws + name + nl

table = @TABLE + nl + statement*
statement =
    var
    transition

item = name | num TOKEN items must be state numbers, or names of other variables.
delim = ',' | wsn
var = 'var' + ws + name + ws? + '=' + ws? + '{' + delim* + item(delim)* + delim* '}' + wsn SYNTAX var <name> = { <name or number>, <name or number>, ... }

`;

function pront(thing, note = null) {
    let p = document.createElement('p');
    document.body.appendChild(p);
    const attached_note = note ? `[Note: ${note}] ` : '';
    p.innerText = `${attached_note}[${typeof thing}] ${thing}`;
}

pront('RUNNING RULE2.JS');

/**
 * lexes stuff.
 *
 * also handles line and column numbers, as well as error formatting.
 */
class Lexer {
    text;
    constructor(text) {
        if (!text) {
            console.log('WARNING: This lexer does not have any text.');
        }
        pront(text);
        this.text = text;
    }

    index = 0;
    line = 1;
    col = 1;
    line_starts = [0];
    current_token = null;
    // ordered by how likely i think they would appear.
    // only exceptions are special-cased identifiers.
    // neighborhoods like margolus|square4cyclic, and symmetries like
    regexes = [
        ['shenanigans', /‮/y],
        ['whitespace', /[\t\f\cK ]+/y],
        ['illegal identifier', /\d[-_\w]+/y],
        ['number', /\d+/y],
        ['keyword', /var|n_states|neighborhood|symmetries/y],
        ['neighborhood', /margolus|square4cyclic/y],
        ['symmetry', /(none)|rot([24])(ref)?|([xy])ref|(diag)/y], // use the capture group to figure out which one
        ['identifier', /[-_a-zA-Z][-_\w]*/y],
        // comma, colon, equal, and braces are for syntax
        // %^&* are indexing characters and were agreed on during this conversation:
        // https://discord.com/channels/357922255553953794/437055638376284161/1256579184793223198
        ['punctuation', /[,:={}%^&*]/y],
        ['newline', /\r?\n/y],
        ['comment', /#.*/y],
        ['header', /@[A-Z]+/y],
        ['unknown', /[\w\W]/y],
    ];

    token_info(token) {
        const value = token.value;
        const out = {
            length: value.length,
            line: token.line,
            col: token.col,
        };
        switch (token.kind) {
            case 'newline':
                out.value = 'Newline';
                return out;
            case 'unknown':
                const code = value.charCodeAt(0);
                out.value = `'${value}' (unrecognized character, code: ${code})`;
                return out;
            case 'end of file':
                length = 1;
                out.value = 'End of File';
                return out;
            case 'shenanigans':
                out.value = 'Unicode Reverse Shenanigans';
                return out;
            default:
                out.value = `'${value}' (${token.kind})`;
                return out;
        }
    }

    /** end_line is exclusive. */
    get_context_lines(start_line, end_line) {
        // defensive programming
        if (this.index < this.text.length) {
            throw 'attempted to get context lines without lexer finishing.';
        }

        const start = this.line_starts[start_line];
        let end = this.line_starts[end_line];
        if (this.text[end - 1] === '\n') {
            end--;
            if (this.text[end - 1] === '\r') {
                end--;
            }
        }
        return this.text.slice(start, end);
    }

    /** finishes lexing all tokens, making them accessible to get_context_lines */
    finish() {
        while (this.next().kind !== 'end of file') {}
    }

    /**
     * lexes a whole token based on a regex.
     *
     * returns a string representing the regex match,
     * or null if the string does not start with a match.
     */
    try_regex(regex) {
        regex.lastIndex = this.index;
        const match = regex.exec(this.text);
        if (match !== null) {
            this.index = regex.lastIndex;
        }
        return match;
    }

    /** returns the next recognized token in the text. */
    read_token() {
        for (const [kind, regex] of this.regexes) {
            const match = this.try_regex(regex);
            if (match === null) {
                continue;
            }
            const out = {
                kind,
                value: match[0],
                line: this.line,
                col: this.col,
            };

            // handle line/column
            if (kind === 'newline') {
                this.line_starts.push(this.index);
                this.line++;
                this.col = 1;
                return out;
            }
            this.col += match[0].length;

            return out;
        }
        return {
            kind: 'end of file',
            value: '',
            line: this.line,
            col: this.col,
        };
    }

    /** peeks the next token. the same token can be consumed using next(). */
    peek() {
        if (this.current_token === null) {
            this.current_token = this.read_token();
        }
        return this.current_token;
    }

    /** returns the next token, then sets the peeked token to null. */
    next() {
        const tmp = this.peek();
        this.current_token = null;
        return tmp;
    }

    /**
     * skip all tokens where cond returns false.
     * returns the first token where cond returns true.
     * may return end of file
     */
    skip_until(cond) {
        while (true) {
            const next = this.peek();
            if (cond(next) || next.kind === 'end of file') {
                return next;
            }
            this.next();
        }
    }

    /** skip_until but with an inverted cond */
    skip_while(cond) {
        while (true) {
            const next = this.peek();
            if (!cond(next) || next.kind === 'end of file') {
                return next;
            }
            this.next();
        }
    }

    /** returns the first token whose kind is in the expected array */
    peek_until = expected =>
        this.skip_until(next => expected.includes(next.kind));

    /** returns the first token whose kind isn't in the skippable array */
    peek_after = skippable =>
        this.skip_while(next => skippable.includes(next.kind));
}

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
            const post_context = this.lexer.get_context_lines(
                line,
                line + post
            );
            const highlight_arrows = ' '.repeat(col - 1) + '^'.repeat(length);
            error_msg += `\n${pre_context}\n${highlight_arrows}\n${post_context}`;
        }
        error_msg += '\n';
        raise_err(error_msg);
    }

    flush_errs(raise_err = console.log) {
        for (const err of this.err_queue) {
            this.raise_err_with(raise_err, err);
        }
        this.err_queue = [];
    }

    finish(raise_err) {
        this.lexer.finish();
        this.flush_errs(raise_err);
    }

    parse_rule_name() {
        const UNNAMED = 'UNNAMED';

        let next = this.lexer.peek_after(WS_NL);
        if (next.kind === 'end of file') {
            this.queue_err_here(
                'This rule is empty. Did you comment out the @RULE declaration?',
                null
            );
            return UNNAMED;
        }
        if (next.kind !== 'header') {
            this.queue_err_here('expected @RULE (header)');
            return UNNAMED;
        }
        if (next.value !== '@RULE') {
            this.queue_err_here('the first header must be @RULE, but');
        }
        this.lexer.next();

        next = this.lexer.peek_after(WS);
        if (next.kind !== 'identifier') {
            this.queue_err_here('expected rule name (identifier) after @RULE');
            return UNNAMED;
        }

        return next.value;
    }

    find_next_header() {
        if (this.lexer.peek_after(WS_NL).kind !== 'header') {
            this.lexer.queue_err_here(
                'expected header, such as @RULE or @TABLE'
            );
        }
        return this.lexer.peek_until(['header']);
    }

    parse() {
        this.parse_rule_name();
        this.finish();
        // let headers = [];
        // while (this.lexer.unfinished()) {

        // }
    }
}

new Parser(test).parse();

// for (let i = 0; i < 1000; i++) {
//     const next = lex.next();
//     if (next === null) {
//         pront('stopped');
//         break;
//     }
//     pront(
//         `<${next.kind}> "${next.value}" @line ${next.line}, col ${next.col}`,
//         'kind value'
//     );
// }

// function test1() {
//     parse(test);
// }

// test1();
