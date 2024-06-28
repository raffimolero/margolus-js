function pront(thing) {
    let p = document.createElement('p');
    document.body.appendChild(p);
    p.innerText = `[${typeof thing}] ${thing}`;
}

pront('RUNNING TEST.JS');

class Thing {
    constructor() {
        this.global++;
    }
}
