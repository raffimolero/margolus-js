var grid;
var interval;
var hold = false;
var brush = 0;

var colors = [];
function makePalette() {
    const table = document.createElement('table');
    document.body.appendChild(table);
    const palette = document.createElement('tr');
    table.appendChild(palette);
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
        tile.className = 'tile palette';
        tile.onclick = e => {
            console.log(brush);
        };

        const label = document.createElement('label');
        tile.appendChild(label);
        label.className = 'tile';
        label.htmlFor = i;

        const input = document.createElement('input');
        label.appendChild(input);
        input.type = 'radio';
        input.value = i;
        input.name = 'brush';

        // const cell = document.createElement('div');
        // label.appendChild(cell);
        // cell.className = 'tile brush';

        label.style.backgroundColor = color;
        label.cellState = i;
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

function makeTile() {
    const tile = document.createElement('td');
    tile.className = 'tile';
    tile.set = state => {
        tile.cellState = state;
        tile.style.backgroundColor = colors[state];
    };
    const set = e => {
        if (!hold) return;
        tile.set(brush);
    };
    tile.onmousedown = e => {
        hold = true;
        brush = +!tile.cellState;
        set();
    };
    tile.onmouseup = e => (hold = false);
    tile.onmouseenter = set;
    return tile;
}

function makeRow(w) {
    const row = document.createElement('tr');
    for (let x = 0; x < w; x++) row.appendChild(makeTile());
    return row;
}

function OTCA(x, tRow, mRow, bRow, rule) {
    let neighbors = 0;
    for (let x2 = x - 1; x2 <= x + 1; x2++) {
        if (isOn(tRow[x2])) neighbors++;
        if (x2 !== x && isOn(mRow[x2])) neighbors++;
        if (isOn(bRow[x2])) neighbors++;
    }
    const section = isOn(mRow[x]) ? 'S' : 'B';
    mRow[x].set(rule[section][neighbors]);
}

function makeGrid(w, h, rule) {
    const grid = document.createElement('table');
    grid.step = () => {
        const rows = grid.childNodes;
        let tRow;
        let mRow = rows[0].childNodes;
        let bRow = rows[1].childNodes;
        for (let y = 1; y < h - 1; y++) {
            tRow = mRow;
            mRow = bRow;
            bRow = rows[y + 1].childNodes;
            for (let x = 1; x < w - 1; x++) OTCA(x, tRow, mRow, bRow, rule);
        }
    };
    grid.onmousedown = e => e.preventDefault();
    for (let y = 0; y < h; y++) grid.appendChild(makeRow(w));
    return grid;
}

function loadRule(rulename) {
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
