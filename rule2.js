const tests = [
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

  var x = { 1, 2, 3, 4, 4

  a, b c d : e fg g h #com

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
    `
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

   
`,
];

const rule_box = document.getElementById('rule');
const err_box = document.getElementById('errors');

function pront(thing, note = null) {
    const attached_note = note ? `[Note: ${note}] ` : '';
    const text = `${attached_note} ${thing}`;

    // console.log(text);
    // return;

    // let p = document.createElement('p');
    // document.body.appendChild(p);
    // p.innerText = text;

    err_box.value += text;
    err_box.value += '\n\n';
    let rows = parseInt(err_box.rows);
    rows = err_box.value.split('\n').length + 3;
    rows = Math.min(rows, 24);
    err_box.rows = rows;
}

const err_box_messages = new RandomBag([
    'No errors :D',
    'Still no errors :D',
    'Good to go buddy :D',
    'All good :D',
    'Should work :D',
    'Does it do the do? :D',
    'Do you want another transition with that? :D',
    'Oooh I think it should work this time :D',
    'The rule might as well write itself :D',
]);
function clera() {
    err_box.value = '';
    err_box.rows = 2;
    err_box.placeholder = err_box_messages.next();
}
clera();

// TODO: if no errors were found, turn the AST into a workable transition table

const random_test = new RandomBag(tests);
function randomTest() {
    rule_box.value = random_test.next();
    getAndParseRule();
}

function getAndParseRule() {
    const test = rule_box.value;
    clera();
    try {
        const out = new Parser(test, pront).parse();
        if (out.errored) {
            pront(`check the console D:`);
        }
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
