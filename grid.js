// the table element that displays the grid
var grid;
// width of grid
var width;
// height of grid
var height;
// active rule
var rule;

// the current margolus parity
var parity = 1;

// margolus grid colors
const activeBorderColor = '#808080';
const inactiveBorderColor = '#404040';

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
}

// sometimes called by a button
// sets all the cells of the grid's border to the specified color
// the grid's border is static and does not change during simulation
function fillBorder(fillColor) {
    if (
        !funnyAssert(
            width * height > 0,
            'load something that isnt nothing pls',
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

// sometimes called by a button
// changes the parity of the margolus grid
function switchParity() {
    parity ^= 1;
    grid.updateTableBorders();
}

// steps the simulation once
function step() {
    grid.step();
}
