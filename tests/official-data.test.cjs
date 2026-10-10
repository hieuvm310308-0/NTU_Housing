const test = require('node:test');
const assert = require('node:assert/strict');
const halls = require('../halls.json');
test('23 official halls have valid map pins and published year metadata', () => {
  assert.equal(halls.length, 23);
  for (const h of halls) {
    assert.match(h.source_url, /^https:\/\/www.ntu.edu.sg\//);
    assert.match(h.map_url, /^https:\/\/maps.ntu.edu.sg\//);
    assert.ok(h.coords.lat > 1.33 && h.coords.lat < 1.37);
    assert.ok(h.coords.lng > 103.66 && h.coords.lng < 103.70);
    assert.ok(h.nearby_food.length && h.nearby_bus_stops.length && h.nearby_schools.length);
    for (const rate of h.renting_rates) for (const year of h.rate_years) assert.ok(Number(rate[year]) > 100);
    assert.equal(h.checked_on, '2026-10-10');
  }
});
test('Hall 1 relocation and actual 2026/27 rates are retained', () => {
  const h = halls.find(h => h.slug === 'hall-1');
  assert.match(h.address, /30 Nanyang Link/);
  assert.equal(h.bathroom_type, 'Common');
  assert.equal(h.renting_rates[0].ay26_27_rate, '602');
  assert.equal(h.renting_rates[0].ay27_28_rate, '635');
  assert.ok(Math.abs(h.coords.lng - 103.68033017) < 0.00001);
});
test('Saraca year exception, thousands and ensuite room size are parsed correctly', () => {
  const h = halls.find(h => h.slug === 'saraca-hall');
  assert.deepEqual(h.rate_years, ['ay25_26_rate','ay26_27_rate']);
  assert.equal(h.room_sizes.single_ensuite, '13.2 sqm');
  assert.equal(h.renting_rates.at(-1).ay26_27_rate, '1005');
  assert.ok(h.renting_rates.every(r => !('ay27_28_rate' in r)));
});
