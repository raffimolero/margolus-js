// what in the hack
const includes = ['util', 'margolus', 'grid', 'rule', 'rle', 'ui', 'app'];
for (const include of includes) {
    const script = document.createElement('script');
    script.src = include + '.js';
    document.body.appendChild(script);
}

/*
TODO list:
https://discord.com/channels/357922255553953794/437055638376284161/1247773229091651634
1) Variables
2) Full dynamic symmetries
3) reversible spec with error detection
4) unbounded universes
5) indexed variables
- rule library dropdown
*/
