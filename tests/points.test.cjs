const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');

const {
  calculatePointsForWalk,
  canRedeemDiscount,
  METERS_PER_MILE,
  metersToMiles,
  STEPS_PER_MILE,
  stepsToMiles,
} = require('../lib/points.ts');

assert.equal(calculatePointsForWalk(0), 0);
assert.equal(calculatePointsForWalk(-2), 0);
assert.equal(calculatePointsForWalk(Number.NaN), 0);

assert.equal(calculatePointsForWalk(1), 100);
assert.equal(calculatePointsForWalk(3.5), 350);

assert.equal(metersToMiles(0), 0);
assert.equal(Number(metersToMiles(METERS_PER_MILE).toFixed(4)), 1);

assert.equal(canRedeemDiscount(200, 150), true);
assert.equal(canRedeemDiscount(149, 150), false);

// stepsToMiles tests
assert.equal(stepsToMiles(0), 0);
assert.equal(stepsToMiles(-100), 0);
assert.equal(stepsToMiles(Number.NaN), 0);
assert.equal(STEPS_PER_MILE, 2112);
assert.equal(Number(stepsToMiles(STEPS_PER_MILE).toFixed(4)), 1);
assert.equal(Number(stepsToMiles(4224).toFixed(4)), 2);

// integration: steps → miles → points
const milesFromSteps = stepsToMiles(2112);
assert.equal(calculatePointsForWalk(milesFromSteps), 100);

console.log('points.test.cjs: all assertions passed');
