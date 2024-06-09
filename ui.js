// the current selected color in the palette
var selectedColor = 0;

// the actual state to draw with, which may be different from the selected color
var activeBrush = selectedColor;

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
