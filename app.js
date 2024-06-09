// starts running the simulation at the speed set by the 'delay' html element
function start() {
    if (timerInterval) return;
    document.getElementById('run').innerHTML = 'Stop';
    timerInterval = setInterval(step, document.getElementById('delay').value);
    step();
}

// pauses the simulation
function stop() {
    if (!timerInterval) return;
    document.getElementById('run').innerHTML = 'Start';
    clearInterval(timerInterval);
    timerInterval = null;
}

// called by a button
// parses and loads the contents of the rule text box
function getAndParseRule() {
    const rule = parseAndAddRule(document.getElementById('rule').value);
    loadRule(rule);
}

// called by a button
// takes the contents of the rle text box and loads it
function getAndLoadRle() {
    loadRle(document.getElementById('rle').value);
}

// called by a button
// steps the simulation, but also pauses it
function manualStep() {
    step();
    stop();
}

// called by a button
// starts/stops the simulation
function toggleRun() {
    if (timerInterval) stop();
    else start();
}

getAndParseRule();
getAndLoadRle();
