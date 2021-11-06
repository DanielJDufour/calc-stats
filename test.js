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
    mean: 65.66666666666667,
    modes: [98],
    mode: 98
  });
});

test("calcHistogram off", ({ eq }) => {
  const results = calcStats(nums[Symbol.iterator](), { calcHistogram: false });
  eq(results, {
    median: 70,
    min: 1,
    max: 99,
    sum: 328350,
    mean: 66.33333333333333,
    modes: [99],
    mode: 99
  });
});

test("calcHistogram off promise array", async ({ eq }) => {
  const data = nums.map(n => Promise.resolve(n))[Symbol.iterator]();
  const results = await calcStats(data, { async: true, calcHistogram: false });
  eq(results, {
    median: 70,
    min: 1,
    max: 99,
    sum: 328350,
    mean: 66.33333333333333,
    modes: [99],
    mode: 99
  });
});

test("median no data", async ({ eq }) => {
  const data = new Array(1e5)
    .fill(-99)
    .concat(new Array(1e2).fill(0))
    .concat(new Array(1e2).fill(1));
  const results = await calcStats(data, { noData: -99 });
  eq(results, {
    median: 0.5,
    min: 0,
    max: 1,
    sum: 100,
    mean: 0.5,
    histogram: { 0: { n: 0, ct: 100 }, 1: { n: 1, ct: 100 } },
    modes: [0, 1],
    mode: 0.5
  });
});
