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
