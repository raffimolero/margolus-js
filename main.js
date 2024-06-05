// TODO list:
// - rule library dropdown

// ===== UTIL =====

// self documenting
function funnyAssert(assertion, errorMessage, bonusMessage) {
    if (!assertion) {
        if (Math.random() < 0.25) alert(bonusMessage);
        else alert(errorMessage);
    }
    return assertion;
}

// ===== GLOBALS =====

// the table element that displays the grid
var grid;
// width of grid
var width;
// height of grid
var height;
// active rule
var rule;

// the rules that have been loaded
const rules = new Map();
function addRule(ruleName, rule) {
    rules.set(ruleName, rule);
}

// the current margolus parity
var parity = 1;

// margolus grid colors
const activeBorderColor = '#808080';
const inactiveBorderColor = '#404040';

// the hex codes for each state color as strings
var colors = [];

// the current selected color in the palette
var selectedColor = 0;

// the actual state to draw with, which may be different from the selected color
var activeBrush = selectedColor;

// ===== DOM =====

// whether the simulation is running
// null means paused, otherwise is an id created by setInterval and can be used in clearInterval
var timerInterval = null;

// whether any mouse button is currently held
var mouseHeld = false;
document.onmouseup = e => (mouseHeld = false);

// hydrate the palette element in the html
function makePalette() {
    const table = document.getElementById('palette');
    const palette = document.createElement('tr');
    table.appendChild(palette);
    const tiles = [];
    for (let i = 0; i < 16; i++) {
        // make color
        let [l, h] = i & 8 ? ['40', 'c0'] : ['00', 'ff'];
        let r = i & 1 ? h : l;
        let g = i & 2 ? h : l;
        let b = i & 4 ? h : l;
        const color = `#${r}${g}${b}`;
        colors.push(color);

        // make tile 'radio button'
        const tile = document.createElement('td');
        palette.appendChild(tile);
        tile.className = 'tile palette';

        const colorDisplay = document.createElement('div');
        tile.appendChild(colorDisplay);
        colorDisplay.className = 'tile color';
        colorDisplay.style.backgroundColor = color;

        tiles.push(colorDisplay);
        const click = () => {
            for (const tile of tiles) {
                tile.classList.remove('selected');
            }
            colorDisplay.classList.add('selected');
            selectedColor = i;
        };
        tile.onclick = click;

        // auto select color state 1
        if (i == 1) {
            click();
        }
    }
}
makePalette();

// create a single clickable tile
function makeTile(x, y, w, h) {
    const tile = document.createElement('td');
    tile.className = 'tile';
    tile.set = state => {
        tile.cellState = state;
        tile.style.backgroundColor = colors[state];
    };
    tile.update = state => {
        if (x == 0 || x == w - 1 || (y == 0) | (y == h - 1)) return;
        tile.set(state);
    };
    tile.updateTableBorders = () => {
        tile.style.borderTopColor =
            (y ^ parity) & 1 ? activeBorderColor : inactiveBorderColor;
        tile.style.borderBottomColor =
            (y ^ parity) & 1 ? activeBorderColor : inactiveBorderColor;
        tile.style.borderLeftColor =
            (x ^ parity) & 1 ? activeBorderColor : inactiveBorderColor;
        tile.style.borderRightColor =
            (x ^ parity) & 1 ? activeBorderColor : inactiveBorderColor;
    };
    const mouseDraw = e => {
        if (!mouseHeld) return;
        tile.set(activeBrush);
    };
    tile.onmousedown = e => {
        mouseHeld = true;
        activeBrush = selectedColor == tile.cellState ? 0 : selectedColor;
        mouseDraw(e);
    };
    tile.onmouseenter = mouseDraw;
    tile.updateTableBorders();
    return tile;
}

// encode an array of 4 states from 0-16 into one 32-bit integer
function encode(arr) {
    return (arr[0] << 0) | (arr[1] << 4) | (arr[2] << 8) | (arr[3] << 12);
}

// decode one 32-bit integer into an array of 4 states from 0-16
function decode(num) {
    return [
        (num >> 0) & 0b1111,
        (num >> 4) & 0b1111,
        (num >> 8) & 0b1111,
        (num >> 12) & 0b1111,
    ];
}

// apply a margolus rule to 4 tile DOM elements
function margolus(a, b, c, d, rule) {
    const output =
        rule[encode([a.cellState, b.cellState, c.cellState, d.cellState])];
    const [e, f, g, h] = decode(output);
    a.update(e);
    b.update(f);
    c.update(g);
    d.update(h);
}

// clear and resize the existing grid
function resizeGrid(w, h) {
    width = w;
    height = h;
    parity = 1;
    grid = document.getElementById('grid');
    grid.innerHTML = '';
    grid.step = () => {
        const rows = grid.childNodes;
        for (let y = parity; y < h - 1; y += 2) {
            const tRow = rows[y].childNodes;
            const bRow = rows[y + 1].childNodes;
            for (let x = parity; x < w - 1; x += 2) {
                const a = tRow[x];
                const b = tRow[x + 1];
                const c = bRow[x];
                const d = bRow[x + 1];
                margolus(a, b, c, d, rule);
            }
        }
        switchParity();
    };
    grid.updateTableBorders = () => {
        for (const row of grid.childNodes) {
            for (const tile of row.childNodes) {
                tile.updateTableBorders();
            }
        }
    };
    grid.onmousedown = e => e.preventDefault();
    for (let y = 0; y < h; y++) {
        const row = document.createElement('tr');
        grid.appendChild(row);
        for (let x = 0; x < w; x++) {
            row.appendChild(makeTile(x, y, w, h));
        }
    }
    return grid;
}

// takes in a source rule table, and tries to
// parse and add it to the global rule library
// returns the rule name on success, null on failure
function parseAndAddRule(ruleText) {
    // TODO: support other margolus neighborhoods
    // like square4cyclic
    const ruleStructureRegex = /@RULE (\S*)\n+([\s\S]*)/;
    const ruleStructure = ruleStructureRegex.exec(ruleText);

    if (
        !funnyAssert(
            ruleStructure,
            'the rule is formatted wrong. i am not advanced enough to tell you what is wrong.',
            'i must be literally illiterate because i cant read this'
        )
    ) {
        return null;
    }

    const ruleName = ruleStructure[1];
    if (
        !funnyAssert(
            ruleName,
            'i cant find the rule in that rle',
            'uh, no rule? anarchy?'
        )
    ) {
        return null;
    }

    const symmetryMap = {
        none: [[0, 1, 2, 3]],
        reflect: [
            [0, 1, 2, 3],
            [1, 0, 3, 2],
        ],
        rotate4: [
            [0, 1, 2, 3],
            [1, 3, 0, 2],
            [3, 2, 1, 0],
            [2, 0, 3, 1],
        ],
        rotate4reflect: [
            [0, 1, 2, 3],
            [1, 3, 0, 2],
            [3, 2, 1, 0],
            [2, 0, 3, 1],
            [1, 0, 3, 2],
            [3, 1, 2, 0],
            [2, 3, 0, 1],
            [0, 2, 1, 3],
        ],
    };

    const symmetryRegex = /\s*symmetries\s*:\s*(\w*)\s*(?:#.*)?/;
    function parseSymmetry(symmetries) {
        const symmetry = symmetryMap[symmetries];
        if (symmetryMap) {
            return symmetry;
        }

        switch (symmetries) {
            case '180':
                funnyAssert(
                    false,
                    `i dont support ${symmetries} as a symmetry`,
                    'rotate bad'
                );
                return [];
            case 'permute':
                funnyAssert(
                    false,
                    'Permute symmetry does not make sense for Margolus.',
                    'think about it for a moment. think about permuting a margolus neighborhood.'
                );
                return [];
            default:
                funnyAssert(
                    false,
                    `the rule has an invalid symmetry: ${symmetries}. i only support none, reflect, rotate4, rotate4reflect.`,
                    'sim a tree? whats that'
                );
                return [];
        }
    }

    const contents = ruleStructure[2];
    // TODO: add variables

    function permute(arr, perm) {
        return perm.map(i => arr[i]);
    }

    // TODO: compile the rule data into something that can be interpreted
    const ruleLine =
        /\s*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*:[\s,]*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*(?:\#.*)?/;

    let symmetry = null;
    const ruleEmulator = [];
    for (const line of contents.split('\n')) {
        const symmetryMatches = symmetryRegex.exec(line);
        if (symmetryMatches?.index == 0) {
            symmetry = parseSymmetry(symmetryMatches[1]);
        }

        const ruleMatches = ruleLine.exec(line);
        if (ruleMatches?.index == 0) {
            const [_, a, b, c, d, e, f, g, h] = ruleMatches;
            for (const permutation of symmetry) {
                const idx = encode(permute([a, b, c, d], permutation));
                const out = encode(permute([e, f, g, h], permutation));
                ruleEmulator.push([idx, out]);
            }
            continue;
        }

        // TODO: other types of line
    }

    // compile all possible transitions using the interpreter
    const table = [];
    for (let i = 0; i < 65536; i++) {
        table.push(i);
        const [tl, tr, bl, br] = decode(i);
        for (const [idx, out] of ruleEmulator) {
            if (i == idx) {
                table[i] = out;
                // console.log(idx, out);
                break;
            }
        }
    }
    addRule(ruleName, table);
    return ruleName;
}

// called by a button
// parses and loads the rule in the rule text box
function getAndParseRule() {
    const rule = parseAndAddRule(document.getElementById('rule').value);
    loadRule(rule);
}

// attempts to load a rule by name
// alerts user but otherwise does nothing on failure
function loadRule(ruleName) {
    const newRule = rules.get(ruleName);
    if (
        funnyAssert(
            newRule,
            'i dont know this rule, maybe you forgot to load rule',
            'this rule name unreadable frfr, misspelled or forgot to load?'
        )
    ) {
        rule = newRule;
    }
}

// takes the raw RLE payload without the header and loads it into the grid
// if borderless is false, adds a border of static state 0 around the RLE
// if borderless is true, uses the RLE's edges as the static border
function loadPattern(rlePayload, borderless) {
    const baseIdx = borderless ? 0 : 1;
    const regex = /(\d*)([\D])/g;
    const rows = grid.childNodes;
    let x = baseIdx;
    let y = baseIdx;
    let row = rows[y];

    for (let run = regex.exec(rlePayload); run; run = regex.exec(rlePayload)) {
        let length = parseInt(run[1]) || 1;
        const chr = run[2];
        if (chr === '!') break;
        switch (chr) {
            case '\n':
            case ' ':
                break;
            case '$':
                x = baseIdx;
                y += length;
                row = rows[y];
                break;
            case 'b':
            case '.':
                x += length;
                break;
            case 'o':
                while (length--) row.childNodes[x++].set(1);
                break;
            default:
                const state = chr.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
                while (length--) row.childNodes[x++].set(state);
        }
    }
}

// loads a given RLE into the grid, with a border of static state 0 around it
// adding '#MARGOLUS' gives extra options:
// - 'borderless' uses the RLE's edges as the static border instead of adding state 0
function loadRle(rle) {
    if (!rle) rle = 'x = 34, y = 21, rule = BBM';
    const regex =
        /([\s\S]*?)x\s*=\s*(\d*),\s*y\s*=\s*(\d*),\s*rule\s*=\s*(\S*)\n([\s\S]*)/;
    const matches = regex.exec(rle);
    if (
        !funnyAssert(
            matches,
            'rle header broke',
            'is your spelling bad or do you not know what an rle is'
        )
    ) {
        return;
    }

    let borderless = false;
    const comments = matches[1];
    let alerted = false;
    for (let line of comments.split('\n')) {
        line = line.trim();
        if (
            !funnyAssert(
                alerted || line.startsWith('#') || line === '',
                'found a bad comment in the rle',
                'why you gotta comment on me like that'
            )
        ) {
            alerted = true;
            continue;
        }
        if (!line.startsWith('#MARGOLUS ')) {
            continue;
        }
        const matches = /#MARGOLUS (static-border)?/.exec(line);
        const [_, borderlessOpt] = matches;
        borderless |= borderlessOpt !== undefined;
        break;
    }

    const w = parseInt(matches[2]) + (borderless ? 0 : 2);
    const h = parseInt(matches[3]) + (borderless ? 0 : 2);
    loadRule(matches[4]);
    const pattern = matches[5];

    resizeGrid(w, h);
    loadPattern(pattern, borderless);
}

function getAndLoadRle() {
    loadRle(document.getElementById('rle').value);
}

function switchParity() {
    parity ^= 1;
    grid.updateTableBorders();
}

function step() {
    if (
        funnyAssert(
            grid,
            'load something pls',
            'yes of course lemme just make a step with no feet'
        )
    ) {
        grid.step();
    }
}

function stepButton() {
    step();
    stop();
}

function stop() {
    document.getElementById('run').innerHTML = 'Start';
    clearInterval(timerInterval);
    timerInterval = null;
}

function start() {
    document.getElementById('run').innerHTML = 'Stop';
    timerInterval = setInterval(step, document.getElementById('delay').value);
}

function toggleRun() {
    if (
        !funnyAssert(
            grid,
            'load pattern pls',
            'do you really expect me to run with no legs'
        )
    ) {
        return;
    }

    if (timerInterval) {
        stop();
    } else {
        step();
        start();
    }
}

function fillBorder(fillColor) {
    if (
        !funnyAssert(
            grid,
            'load pattern pls',
            'bruv am i really boutta build the great wall of china but without the china'
        )
    ) {
        return;
    }
    for (const tile of grid.childNodes[0].childNodes) {
        tile.set(fillColor);
        tile.updateTableBorders();
    }
    for (const tile of grid.childNodes[height - 1].childNodes) {
        tile.set(fillColor);
        tile.updateTableBorders();
    }
    for (const tr of grid.childNodes) {
        const row = tr.childNodes;
        row[0].set(fillColor);
        row[0].updateTableBorders();
        row[width - 1].set(fillColor);
        row[width - 1].updateTableBorders();
    }
}

getAndParseRule();
getAndLoadRle();
