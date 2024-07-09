// self documenting
function funnyAssert(assertion, errorMessage, bonusMessage) {
    if (!assertion) {
        if (Math.random() < 0.25) alert(bonusMessage);
        else alert(errorMessage);
    }
    return assertion;
}

function dbg(x) {
    console.log(x);
    return x;
}

function panic() {
    bail(
        'rsboi done goofed, did a bad, and used a function wrong. read the stack trace.'
    );
}

/** in case we want the stack trace and to catch the error at the same time */
function bail(msg) {
    console.trace(msg);
    throw msg;
}
