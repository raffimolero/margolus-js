const test = `

# la;sdfjk;
#

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

// lexes stuff.
// TOKEN TYPES:
// identifier
// number
// punctuation
// newline
class Lexer {
    text;
    index = 0;
    line = 1;
    col = 1;
    current_token = null;
    // ordered by how likely i think they would appear.
    // only exceptions are special-cased identifiers.
    // neighborhoods like margolus|square4cyclic, and symmetries like
    regexes = [
        ['whitespace', /[\t\f\cK ]+/y],
        ['num', /\d+/y],
        ['kw', /var|n_states|neighborhood|symmetries/y],
        ['neighborhood', /margolus|square4cyclic/y],
        ['symmetry', /(none)|rot([24])(ref)?|([xy])ref|(diag)/y], // use the capture group to figure out which one
        ['ident', /[-_a-zA-Z][-_\w]*/y],
        // comma, colon, equal, and braces are for syntax
        // %^&* are indexing characters and were agreed on during this conversation:
        // https://discord.com/channels/357922255553953794/437055638376284161/1256579184793223198
        ['punctuation', /[,:={}%^&*]/y],
        ['newline', /\r?\n/y],
        ['header', /@[A-Z]+/y],
        ['comment', /#.*/y],
    ];

    constructor(text) {
        pront(text);
        this.text = text;
    }

    // lexes a whole token based on a regex.
    // returns a string representing the regex match, or null if the string does not start with a match.
    try_regex(regex) {
        regex.lastIndex = this.index;
        const match = regex.exec(this.text);
        if (match !== null) {
            this.index = regex.lastIndex;
        }
        return match;
    }

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
                this.line++;
                this.col = 1;
            } else {
                this.col += match[0].length;
            }
            return out;
        }
        return null;
    }

    peek() {
        if (this.current_token === null) {
            this.current_token = this.read_token();
        }
        return this.current_token;
    }

    next() {
        const tmp = this.peek();
        this.current_token = null;
        return tmp;
    }
}

let lex = new Lexer(test);
for (let i = 0; i < 1000; i++) {
    const next = lex.next();
    if (next === null) {
        pront('stopped');
        break;
    }
    pront(
        `<${next.kind}> "${next.value}" @line ${next.line}, col ${next.col}`,
        'kind value'
    );
}

class Parser {
    // TODO
}

// function test1() {
//     parse(test);
// }

// test1();
