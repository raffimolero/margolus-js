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

tests = [
    `
@RULE #asdlfjk;
@RULE @RULE @RULE
@RULE @TABLE
@RULE 3

@RULE 3ASDLFKJ asdf asf

@TABLE

;;;;;symmetries none
neighborhood: moo
symmetries: quack
sym: asdf
var works?
asdf, asdf, asdf: 1 2 3
3 4 5: 1 2 3

31adfasd
test # asdl;fj
#copmment

@TABLE
woah #another table
    symmetries   : moore
  neighborhood : none #asdfj

`,
    `@RULE Two

@TABLE
  symmetries : none   # comment
var a       , b,   c 


d,e,f,g,h = { 1, 2 

 #lalala

4 8 abc 123}

       1 
a , ,,, b c d : e g g d # comment
a , ,,, b c d : e g g e d # comment

  `,
];

function pront(thing, note = null) {
    const attached_note = note ? `[Note: ${note}] ` : '';
    const text = `${attached_note}[${typeof thing}] ${thing}`;

    console.log(text);
    return;

    let p = document.createElement('p');
    document.body.appendChild(p);
    p.innerText = text;
}

pront('RUNNING RULE2.JS');

for (const test of tests) {
    try {
        const out = new Parser(test, pront).parse();
        console.log(out);
    } catch (err) {
        pront(err);
    }
}

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
