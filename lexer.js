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
    lines = [0];
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
        ['header', /@[A-Z]*/y],
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
            case 'illegal identifier':
                out.value = `'${value}' (illegal identifier; must not start with a number)`;
                return out;
            case 'unknown':
                const code = value.charCodeAt(0);
                out.value = `'${value}' (unrecognized character, code: ${code})`;
                return out;
            case 'end of file':
                out.length = 1;
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
        if (this.unfinished()) {
            throw 'attempted to get context lines without lexer finishing.';
        }

        const clamp = val => Math.max(0, Math.min(this.lines.length - 1, val));
        const start = this.lines[clamp(start_line)];
        let end = this.lines[clamp(end_line)];
        if (this.text[end - 1] === '\n') {
            end--;
            if (this.text[end - 1] === '\r') {
                end--;
            }
        }
        return this.text.slice(start, end);
    }

    /** returns true if end of file has not been reached. */
    unfinished() {
        return this.peek().kind !== 'end of file';
    }

    /** finishes lexing all tokens, making them accessible to get_context_lines */
    finish() {
        while (this.next().kind !== 'end of file') {}
        this.lines.push(this.index);
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
                this.lines.push(this.index);
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
