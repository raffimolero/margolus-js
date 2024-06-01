var grid;
var parity = 0;
var interval;
var hold = false;
var selectedColor = 0;
var activeBrush = selectedColor;

var colors = [];
function makePalette() {
    const table = document.createElement('table');
    document.body.appendChild(table);
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

function makeTile(x, y) {
    const tile = document.createElement('td');
    tile.className = 'tile';
    tile.set = state => {
        tile.cellState = state;
        tile.style.backgroundColor = colors[state];
    };
    const set = e => {
        if (!hold) return;
        // console.log(x, y);
        tile.set(activeBrush);
    };
    tile.onmousedown = e => {
        hold = true;
        activeBrush = selectedColor == tile.cellState ? 0 : selectedColor;
        set(null);
    };
    tile.onmouseup = e => (hold = false);
    tile.onmouseenter = set;
    return tile;
}

function makeRow(w, y) {
    const row = document.createElement('tr');
    for (let x = 0; x < w; x++) row.appendChild(makeTile(x, y));
    return row;
}

// function OTCA(x, tRow, mRow, bRow, rule) {
//     let neighbors = 0;
//     for (let x2 = x - 1; x2 <= x + 1; x2++) {
//         if (isOn(tRow[x2])) neighbors++;
//         if (x2 !== x && isOn(mRow[x2])) neighbors++;
//         if (isOn(bRow[x2])) neighbors++;
//     }
//     const section = isOn(mRow[x]) ? 'S' : 'B';
//     mRow[x].set(rule[section][neighbors]);
// }

function margolus(tl, tr, bl, br, rule) {
    const output =
        rule[
            (tl.cellState << 0) |
                (tr.cellState << 4) |
                (bl.cellState << 8) |
                (br.cellState << 12)
        ];
    tl.set((output >> 0) & 0b1111);
    tr.set((output >> 4) & 0b1111);
    bl.set((output >> 8) & 0b1111);
    br.set((output >> 12) & 0b1111);
}

function makeGrid(w, h, rule) {
    const grid = document.createElement('table');
    grid.step = () => {
        const rows = grid.childNodes;
        for (let y = parity; y < h - 1; y += 2) {
            const tRow = rows[y].childNodes;
            const bRow = rows[y + 1].childNodes;
            for (let x = parity; x < w - 1; x += 2) {
                const tl = tRow[x];
                const tr = tRow[x + 1];
                const bl = bRow[x];
                const br = bRow[x + 1];
                margolus(tl, tr, bl, br, rule);
            }
        }
        parity = +!parity;
    };
    grid.onmousedown = e => e.preventDefault();
    for (let y = 0; y < h; y++) grid.appendChild(makeRow(w, y));
    return grid;
}

function loadRule(rulename) {
    return new Array(65536).fill(0x1234);

    // disabled
    const emulated = /(\S*)Emulated/.exec(rulename);
    if (emulated) rulename = emulated[1];
    const aliases = {
        Life: 'B3S23',
        Seeds: 'B2S',
    };
    if (rulename in aliases) rulename = aliases[rulename];

    const regex = /B(\d*)S(\d*)/;
    const matches = regex.exec(rulename);
    if (
        !funnyAssert(
            matches,
            `i cant load '${rulename}' as a rule`,
            'this rule name is as jarring as your handwriting'
        )
    )
        return;

    var rule = {
        B: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        S: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    for (let b of matches[1]) rule.B[parseInt(b)] = 1;
    for (let s of matches[2]) rule.S[parseInt(s)] = 1;
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
        switch (run[2]) {
            case 'o':
            case 'A':
                while (length--) row.childNodes[x++].classList.add('on');
                break;
            case '$':
                x = 1;
                y += length;
                row = rows[y];
                break;
            default:
                x += length;
        }
    }
}

function load(rle) {
    if (!rle) rle = 'x = 34, y = 21, rule = NaiveLifeEmulated';
    const regex = /x = (\d*), y = (\d*), rule = (Naive)?(\S*)\n?(.*)/;
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
    if (
        !funnyAssert(
            matches[3],
            'i cant handle naivent rules',
            'there is more wisdom in this rule than your head smh'
        )
    )
        return;
    const rule = loadRule(matches[4]);

    const pattern = matches[5];
    if (grid) document.body.removeChild(grid);
    grid = makeGrid(width, height, rule);
    document.body.appendChild(grid);
    loadPattern(grid, pattern);
}

function loadRle() {
    load(document.getElementById('rle').value);
}

function step() {
    if (
        funnyAssert(
            grid,
            'load something pls',
            'yes of course lemme just make a step with no feet'
        )
    )
        grid.step();
}

function run() {
    if (
        !funnyAssert(
            grid,
            'load pattern pls',
            'do you really expect me to run with no legs'
        )
    )
        return;
    if (interval) {
        document.getElementById('run').innerHTML = 'Start';
        clearInterval(interval);
        interval = null;
    } else {
        document.getElementById('run').innerHTML = 'Stop';
        interval = setInterval(step, document.getElementById('delay').value);
    }
}

loadRle();
