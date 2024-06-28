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
   var a =  { ,0 , 1 , 2, 3 }
var b   =   a

   
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
    if (note !== null) {
        note = `[Note: ${note}] `;
    }
    p.innerText = `${note}[${typeof thing}] ${thing}`;
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
    current_token = null;
    regexes = {
        ws: /\s+/,
        num: /\d+/,
    };

    constructor(text) {
        pront(text);
        this.text = text;
    }

    // lexes a whole token based on a regex.
    // returns a string representing the regex match, or null if the string does not start with a match.
    hack_regex(regex) {
        regex.lastIndex = this.index;
        const match = regex.exec(this.text);
        const started_with =
            match !== null && this.index === regex.lastIndex - match[0].length;
        if (!started_with) {
            return null;
        }
        this.index = regex.lastIndex;
        return match[0];
    }

    skip_whitespace() {
        this.hack_regex(this.regexes.ws);
    }

    read_token() {
        this.skip_whitespace();
        for (const [kind, regex] of Object.entries(this.regexes)) {
            const match = this.hack_regex(regex);
            if (match !== null) {
                pront(this.index, 'index');
                pront(kind, 'kind');
                pront(match, 'match');
                return { kind, value: match };
            }
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

let lex = new Lexer('test');
for (let i = 0; i < 100; i++) {
    const next = lex.next();
    if (next === null) {
        pront('stopped');
        break;
    }
    pront(next.kind, 'kind');
    pront(next.value, 'val');
}

// function tokenize(rule) {
//     const tokens = [];
//     for (let i = 0; i < rule.length; i++) {
//         if (tokens[i].) {

//         }
//     }
// }

// function parse(rule) {
//     const whitespace = /[\n\r\s]+/;
//     for (const line of rule.split(whitespace)) {
//         /regex/.test(line);
//         if (line.contains()) console.log(line.trim());
//     }
// }

// function test1() {
//     parse(test);
// }

// test1();
