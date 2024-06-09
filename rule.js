// the rules that have been loaded
const rules = new Map();
function addRule(ruleName, rule) {
    rules.set(ruleName, rule);
}

// the hex codes for each state color as strings
var colors = [];
// takes in a source rule table, and tries to
// parse and add it to the global rule library
// returns the rule name on success, null on failure
function parseAndAddRule(ruleText) {
    // TODO: support other margolus neighborhoods
    // like square4cyclic
    const ruleStructureRegex = /@RULE (\S*)\n+([\s\S]*)/;
    const ruleStructure = ruleStructureRegex.exec(ruleText);

    if (
        !funnyAssert(
            ruleStructure,
            'the rule is formatted wrong. i am not advanced enough to tell you what is wrong.',
            'i must be literally illiterate because i cant read this'
        )
    ) {
        return null;
    }

    const ruleName = ruleStructure[1];
    if (
        !funnyAssert(
            ruleName,
            'i cant find the rule in that rle',
            'uh, no rule? anarchy?'
        )
    ) {
        return null;
    }

    const symmetryMap = {
        none: [[0, 1, 2, 3]],
        reflect: [
            [0, 1, 2, 3],
            [1, 0, 3, 2],
        ],
        rotate4: [
            [0, 1, 2, 3],
            [1, 3, 0, 2],
            [3, 2, 1, 0],
            [2, 0, 3, 1],
        ],
        rotate4reflect: [
            [0, 1, 2, 3],
            [1, 3, 0, 2],
            [3, 2, 1, 0],
            [2, 0, 3, 1],
            [1, 0, 3, 2],
            [3, 1, 2, 0],
            [2, 3, 0, 1],
            [0, 2, 1, 3],
        ],
    };

    const symmetryRegex = /\s*symmetries\s*:\s*(\w*)\s*(?:#.*)?/;
    function parseSymmetry(symmetries) {
        const symmetry = symmetryMap[symmetries];
        if (symmetryMap) {
            return symmetry;
        }

        switch (symmetries) {
            case '180':
                funnyAssert(
                    false,
                    `i dont support ${symmetries} as a symmetry`,
                    'rotate bad'
                );
                return [];
            case 'permute':
                funnyAssert(
                    false,
                    'Permute symmetry does not make sense for Margolus.',
                    'think about it for a moment. think about permuting a margolus neighborhood.'
                );
                return [];
            default:
                funnyAssert(
                    false,
                    `the rule has an invalid symmetry: ${symmetries}. i only support none, reflect, rotate4, rotate4reflect.`,
                    'sim a tree? whats that'
                );
                return [];
        }
    }

    const contents = ruleStructure[2];
    // TODO: add variables

    function permute(arr, perm) {
        return perm.map(i => arr[i]);
    }

    // TODO: compile the rule data into something that can be interpreted
    const ruleLine =
        /\s*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*:[\s,]*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*(\w*)[\s,]*(?:\#.*)?/;

    let symmetry = null;
    const ruleEmulator = [];
    for (const line of contents.split('\n')) {
        const symmetryMatches = symmetryRegex.exec(line);
        if (symmetryMatches?.index == 0) {
            symmetry = parseSymmetry(symmetryMatches[1]);
        }

        const ruleMatches = ruleLine.exec(line);
        if (ruleMatches?.index == 0) {
            const [_, a, b, c, d, e, f, g, h] = ruleMatches;
            for (const permutation of symmetry) {
                const idx = encode(permute([a, b, c, d], permutation));
                const out = encode(permute([e, f, g, h], permutation));
                ruleEmulator.push([idx, out]);
            }
            continue;
        }

        // TODO: other types of line
    }

    // compile all possible transitions using the interpreter
    const table = [];
    for (let i = 0; i < 65536; i++) {
        table.push(i);
        const [tl, tr, bl, br] = decode(i);
        for (const [idx, out] of ruleEmulator) {
            if (i == idx) {
                table[i] = out;
                // console.log(idx, out);
                break;
            }
        }
    }
    addRule(ruleName, table);
    return ruleName;
}

// attempts to load a rule by name
// alerts user but otherwise does nothing on failure
function loadRule(ruleName) {
    const newRule = rules.get(ruleName);
    if (
        funnyAssert(
            newRule,
            'i dont know this rule, maybe you forgot to load rule',
            'this rule name unreadable frfr, misspelled or forgot to load?'
        )
    ) {
        rule = newRule;
    }
}
