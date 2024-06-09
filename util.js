// self documenting
function funnyAssert(assertion, errorMessage, bonusMessage) {
    if (!assertion) {
        if (Math.random() < 0.25) alert(bonusMessage);
        else alert(errorMessage);
    }
    return assertion;
}
