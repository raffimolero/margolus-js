// TODO list:
// - rule library dropdown

var grid;
var parity = 1;
var timerInterval;
var hold = false;
document.onmouseup = e => (hold = false);
var selectedColor = 0;
var activeBrush = selectedColor;

var colors = [];
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

        // make tile radio button
        const tile = document.createElement('td');
        palette.appendChild(tile);
        tile.className = 'tile';

        const colorDisplay = document.createElement('div');
        tile.appendChild(colorDisplay);
        colorDisplay.className = 'tile palette';
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

function funnyAssert(value, error, bonus) {
    if (!value) {
        if (Math.random() < 0.25) alert(bonus);
        else alert(error);
    }
    return value;
}

const active = '#808080';
const inactive = '#404040';
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
    tile.updateBorders = () => {
        tile.style.borderTopColor = (y ^ parity) & 1 ? active : inactive;
        tile.style.borderBottomColor = (y ^ parity) & 1 ? active : inactive;
        tile.style.borderLeftColor = (x ^ parity) & 1 ? active : inactive;
        tile.style.borderRightColor = (x ^ parity) & 1 ? active : inactive;
    };
    const mouseSet = e => {
        if (!hold) return;
        // console.log(x, y);
        tile.set(activeBrush);
    };
    tile.onmousedown = e => {
        hold = true;
        activeBrush = selectedColor == tile.cellState ? 0 : selectedColor;
        mouseSet(e);
    };
    tile.onmouseenter = mouseSet;
    tile.updateBorders();
    return tile;
}

function encode(arr) {
    return (arr[0] << 0) | (arr[1] << 4) | (arr[2] << 8) | (arr[3] << 12);
}

function decode(num) {
    return [
        (num >> 0) & 0b1111,
        (num >> 4) & 0b1111,
        (num >> 8) & 0b1111,
        (num >> 12) & 0b1111,
    ];
}

function margolus(a, b, c, d, rule) {
    const output =
        rule[encode([a.cellState, b.cellState, c.cellState, d.cellState])];
    const [e, f, g, h] = decode(output);
    a.update(e);
    b.update(f);
    c.update(g);
    d.update(h);
}

function changeGrid(w, h, rule) {
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
    grid.updateBorders = () => {
        for (const row of grid.childNodes) {
            for (const tile of row.childNodes) {
                tile.updateBorders();
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

const rules = new Map();
function addRule(ruleName, rule) {
    rules.set(ruleName, rule);
}

function parseAndAddRule(ruleText) {
    // TODO: support other margolus neighborhoods
    // like square4cyclic
    const ruleStructureRegex = /@RULE (\S*)\n+([\s\S]*)/;
    const ruleStructure = ruleStructureRegex.exec(ruleText);

    if (
        !funnyAssert(
            ruleStructure,
            'The rule is formatted wrong. I am not advanced enough to tell you what is wrong.',
            'i must be literally illiterate because i cant read this'
        )
    ) {
        return null;
    }

    const ruleName = ruleStructure[1];
    if (
        !funnyAssert(
            ruleName,
            "I couldn't get the rule name for that RLE.",
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
                    `${symmetries} is not supported at the moment.`,
                    'rotate bad'
                );
                return null;
            case 'permute':
                funnyAssert(
                    false,
                    'Permute symmetry does not make sense for Margolus.',
                    'think about it for a moment. think about permuting a margolus neighborhood.'
                );
                return null;
            default:
                funnyAssert(
                    false,
                    `The rule has an invalid symmetry: ${symmetries}. I only support none, reflect, rotate4, rotate4reflect.`,
                    'sim a tree? whats that'
                );
                return null;
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
    // for (const [idx, out] of ruleEmulator) {
    //     console.log(decode(idx));
    //     console.log(decode(out));
    //     console.log('---');
    // }

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
    // console.log(table);
    addRule(ruleName, table);
    return ruleName;
}

function getAndParseRule() {
    const rule = parseAndAddRule(document.getElementById('rule').value);
    loadRule(rule);
}

function loadRule(ruleName) {
    const rule = rules.get(ruleName);
    funnyAssert(
        rule,
        "I don't know this rule. Maybe you forgot to Load Rule?",
        'this rule name unreadable frfr, misspelled or forgot to load?'
    );
    return rule;
}

function loadPattern(grid, pattern) {
    const regex = /(\d*)([\D])/g;
    const rows = grid.childNodes;
    let x = 1;
    let y = 1;
    let row = rows[y];

    for (let run = regex.exec(pattern); run; run = regex.exec(pattern)) {
        let length = parseInt(run[1]) || 1;
        const chr = run[2];
        switch (chr) {
            case '\n':
            case ' ':
                break;
            case '$':
                x = 1;
                y += length;
                row = rows[y];
                break;
            case '!':
                return;
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

function loadRle(rle) {
    if (!rle) rle = 'x = 34, y = 21, rule = BBM';
    const regex =
        /x\s*=\s*(\d*),\s*y\s*=\s*(\d*),\s*rule\s*=\s*(\S*)\n([\s\S]*)/;
    const matches = regex.exec(rle);
    if (
        !funnyAssert(
            matches,
            'rle header broke',
            'is your spelling bad or do you not know what an rle is'
        )
    )
        return;
    const width = parseInt(matches[1]) + 2;
    const height = parseInt(matches[2]) + 2;
    const rule = loadRule(matches[3]);

    const pattern = matches[4];
    changeGrid(width, height, rule);
    loadPattern(grid, pattern);
}

function getAndLoadRle() {
    loadRle(document.getElementById('rle').value);
}

function switchParity() {
    parity ^= 1;
    grid.updateBorders();
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

getAndParseRule();
getAndLoadRle();
