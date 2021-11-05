const test = require("flug");
const calcStats = require("./calc-stats");

const nums = [];

const histogram = {};
for (let i = 1; i < 100; i++) {
  for (let n = 0; n < i; n++) {
    nums.push(i);
  }
  histogram[i] = { n: i, ct: i };
}

const expectation = {
  histogram,
  min: 1,
  max: 99,
  mean: 66.33333333333333,
  median: 70,
  mode: 99,
  modes: [99],
  sum: 328350
};

test("array", ({ eq }) => {
  const results = calcStats(nums);
  eq(results, expectation);
});

test("async array", async ({ eq }) => {
  const results = await calcStats(
    nums.map(n => Promise.resolve(n)),
    { async: true }
  );
  eq(results, expectation);
});

test("iterator", ({ eq }) => {
  const results = calcStats(nums[Symbol.iterator]());
  eq(results, expectation);
});

test("no data", ({ eq }) => {
  const results = calcStats(nums[Symbol.iterator](), {
    calcHistogram: false,
    noData: 99
  });
  eq(results, {
    median: 70,
    min: 1,
    max: 98,
    sum: 318549,
    mean: 64.35333333333334,
    modes: [98],
    mode: 98
  });
});
