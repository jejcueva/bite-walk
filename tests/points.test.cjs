const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');

const {
  calculatePointsForWalk,
  canRedeemDiscount,
  METERS_PER_MILE,
  metersToMiles,
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

console.log('points.test.cjs: all assertions passed');
