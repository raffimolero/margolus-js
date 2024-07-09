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

/** in case we want the stack trace while catching the error at the same time */
function yeet(msg) {
    console.trace(msg);
    throw msg;
}

function panic() {
    yeet(
        'rsboi done goofed, did a bad, and used a function wrong. read the stack trace.'
    );
}

const rand_int = n => Math.floor(Math.random() * n);

function shuffle(array) {
    for (let dst = 0; dst < array.length - 1; dst++) {
        const src = rand_int(array.length);
        const tmp = array[dst];
        array[dst] = array[src];
        array[src] = tmp;
    }
}

/**
 * give it N possibilities and:
 * - every N items contains every possibility
 * - no item will appear twice in a row
 */
class RandomBag {
    queue;
    index;
    /**
     * @param {[*]} possibilities every possible item this random bag could return. does not deep copy.
     */
    constructor(possibilities) {
        shuffle(possibilities);
        this.queue = possibilities;
        this.index = 0;
    }

    next() {
        if (this.index >= this.queue.length) {
            const last = this.queue.pop();
            shuffle(this.queue);
            const dst = rand_int(this.queue.length) + 1;
            this.queue.push(this.queue[dst]);
            this.queue[dst] = last;
            this.index = 0;
        }
        return this.queue[this.index++];
    }
}

function test_bag() {
    const bag = new RandomBag([1, 2, 3, 4]);
    let prev = 0;
    for (let i = 0; i < 10000; i++) {
        const cur = bag.next();
        if (prev === cur) {
            panic();
            return;
        }
        prev = cur;
    }
    console.log('success');
}
// test_bag();
