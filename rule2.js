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

test = `@RULE
ASDLFKJ`;

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

new Parser(test).parse(console.log);

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
