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
