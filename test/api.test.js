const test = require("node:test");
const assert = require("node:assert/strict");
const { toFeatures } = require("../lib/api");

test("flattens 125 object samples in x-y-z order", () => {
  const features = toFeatures({ samples: Array.from({ length: 125 }, (_, i) => ({ x: i, y: i + 1, z: i + 2 })) });
  assert.equal(features.length, 375);
  assert.deepEqual(features.slice(0, 6), [0, 1, 2, 1, 2, 3]);
});

test("accepts exactly 375 raw features", () => {
  assert.equal(toFeatures({ features: Array(375).fill(0) }).length, 375);
});

test("rejects an invalid sample count", () => {
  assert.throws(() => toFeatures({ samples: [] }), /exactly 125/);
});

test("rejects non-numeric features", () => {
  assert.throws(() => toFeatures({ features: [...Array(374).fill(0), "nope"] }), /finite numbers/);
});
