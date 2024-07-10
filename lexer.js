function punctuation_name(punct_val) {
    return (
        {
            ',': 'comma',
            ':': 'colon',
            '=': 'equals sign',
            '{': 'open brace',
            '}': 'close brace',
            '%': 'percent',
            '^': 'caret',
            '&': 'ampersand',
            '*': 'asterisk',
        }[punct_val] || 'unknown punctuation'
    );
}

function punctuation_info(punct_val) {
    return `${punctuation_name(punct_val)} ('${punct_val}', punctuation)`;
}

function token_info(token) {
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
        case 'punctuation':
            out.value = punctuation_info(value);
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

/**
 * lexes stuff.
 *
 * also handles line and column numbers, as well as error formatting.
 */
class Lexer {
    text;
    lines;
    constructor(text) {
        if (!text) {
            console.log('WARNING: This lexer does not have any text.');
        }
        this.lines = [0];
        for (const match of text.matchAll(/\n/g)) {
            this.lines.push(match.index + 1);
        }
        this.lines.push(text.length);
        this.text = text;
    }

    // FOR ERRORS
    times_eof_read = 0;

    index = 0;
    line = 1;
    col = 1;
    current_token = null;
    // ordered by how likely i think they would appear.
    // only exceptions are special-cased identifiers.
    // neighborhoods like margolus|square4cyclic, and symmetries like
    regexes = [
        ['shenanigans', /‮/y],
        ['whitespace', /[\t\f\cK ]+/y],
        ['illegal identifier', /\d+[-_a-zA-Z][-_\w]*/y],
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

    line_num_digits() {
        return this.lines.length.toString().length;
    }

    /** gets how much padding is used for the line numbers */
    code_block_padding() {
        return this.line_num_digits() + 4;
    }

    /** end_line is exclusive. */
    get_context_lines(start_line, end_line) {
        const clamp = val => Math.max(0, Math.min(this.lines.length - 1, val));
        start_line = clamp(start_line);
        end_line = clamp(end_line);
        const start = this.lines[start_line];
        let end = this.lines[end_line];
        if (this.text[end - 1] === '\n') {
            end--;
            if (this.text[end - 1] === '\r') {
                end--;
            }
        }
        const raw = this.text.slice(start, end);
        const pad = this.line_num_digits();
        let out = '';
        for (const line of raw.split('\n')) {
            start_line++;
            const line_number = start_line.toString().padStart(pad);
            out += ` ${line_number} | ${line}\n`;
        }
        return out;
    }

    /** returns true if end of file has not been reached. */
    unfinished() {
        return this.peek().kind !== 'end of file';
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
            const value = match.shift();
            const out = {
                kind,
                value,
                captures: match,
                line: this.line,
                col: this.col,
            };

            // handle line/column
            if (kind === 'newline') {
                this.line++;
                this.col = 1;
                return out;
            }
            this.col += value.length;

            return out;
        }

        // for debugging
        this.times_eof_read++;
        if (this.times_eof_read > 1_000) {
            yeet('INFINITE LOOP DETECTED');
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
