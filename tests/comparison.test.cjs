const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadApp() {
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) {
            const classes = new Set();
            elements.set(id, {
                textContent: '', innerHTML: '', disabled: false, checked: false,
                events: {}, classList: {
                    add: name => classes.add(name), remove: name => classes.delete(name),
                    contains: name => classes.has(name)
                },
                addEventListener(type, handler) { this.events[type] = handler; },
                scrollIntoView() { this.scrolled = true; },
                focus() { this.focused = true; }
            });
        }
        return elements.get(id);
    }
    const document = {
        events: {}, getElementById: element,
        querySelectorAll: () => [], querySelector: () => element('checkbox'),
        addEventListener(type, handler) { this.events[type] = handler; }
    };
    const context = vm.createContext({ document, localStorage: { getItem: () => null },
        lucide: { createIcons() {} }, alert() {} });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), context);
    return { context, element, document, run: code => vm.runInContext(code, context) };
}

test('navigation guides selection, opens the table and Escape closes it', () => {
    const app = loadApp();
    app.run('setupEventListeners()');
    app.element('nav-compare-btn').events.click({ preventDefault() {} });
    assert.match(app.element('comparison-status').textContent, /at least 2 halls/);
    assert.equal(app.element('explore').scrolled, true);
    const halls = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'halls.json'), 'utf8'));
    app.context.fixtures = halls;
    app.run('hallsData = fixtures; toggleComparison(fixtures[0].slug, true)');
    assert.equal(app.element('open-comparison-btn').disabled, true);
    app.run('toggleComparison(fixtures[1].slug, true)');
    assert.equal(app.element('open-comparison-btn').disabled, false);
    app.element('nav-compare-btn').events.click({ preventDefault() {} });
    assert.equal(app.element('comparison-modal').classList.contains('active'), true);
    assert.match(app.element('comparison-table-content').innerHTML, /S\$602/);
    app.document.events.keydown({ key: 'Escape' });
    assert.equal(app.element('comparison-modal').classList.contains('active'), false);
});

test('selection remains unique, caps at three and clears correctly', () => {
    const app = loadApp();
    app.run("hallsData = ['a', 'b', 'c', 'd'].map(slug => ({slug, name: slug})); toggleComparison('a', true); toggleComparison('a', true)");
    assert.equal(app.run('comparedHalls.length'), 1);
    app.run("toggleComparison('b', true); toggleComparison('c', true); toggleComparison('d', true)");
    assert.equal(app.run('comparedHalls.length'), 3);
    app.run("toggleComparison('b', false)");
    assert.equal(app.run('comparedHalls.length'), 2);
    app.run('clearComparison()');
    assert.equal(app.run('comparedHalls.length'), 0);
    assert.equal(app.element('open-comparison-btn').disabled, true);
    assert.equal(app.element('comparison-drawer').classList.contains('active'), false);
});

test('rent rows align configurations and distinguish missing rates and rooms', () => {
    const app = loadApp();
    app.context.fixtures = [
        { renting_rates: [
            { room_type: 'Single Room (Air-con)', ay26_27_rate: '652' },
            { room_type: 'Double Room (Non Air-con)', ay26_27_rate: '-' }
        ] },
        { renting_rates: [{ room_type: ' single  room (air-con) ', ay26_27_rate: '670' }] }
    ];
    const rows = app.run('buildComparisonRentRows(fixtures)');
    assert.equal((rows.match(/<tr>/g) || []).length, 2);
    assert.match(rows, /Rate unavailable<\/td><td>Not offered/);
    assert.match(rows, /S\$652<\/td><td class="highlight-cell">S\$670/);
    assert.doesNotMatch(rows, /\$N\/A/);
    assert.match(app.run('buildComparisonRentRows([{}, {}])'), /Rate unavailable/);
    assert.equal(app.run('escapeComparisonText("<room>")'), '&lt;room&gt;');
});
