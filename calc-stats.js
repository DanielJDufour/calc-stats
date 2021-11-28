const { getOrCreateIterator } = require("iter-fun");
const fasterMedian = require("faster-median");

const computeVariance = ({ count, histogram, mean }) => {
  return (
    Object.values(histogram).reduce((sum, { n, ct }) => {
      return sum + ct * Math.pow(n - mean, 2);
    }, 0) / count
  );
};

function calcStats(
  data,
  {
    async = false,
    noData = undefined,
    filter = undefined,
    calcCount = true,
    calcHistogram = true,
    calcMax = true,
    calcMean = true,
    calcMedian = true,
    calcMin = true,
    calcMode = true,
    calcModes = true,
    calcRange = true,
    calcStd = true,
    calcSum = true,
    calcVariance = true,
    calcUniques = true,
    stats
  } = { debugLevel: 0 }
) {
  if (stats) {
    // validate stats argument
    stats.forEach(stat => {
      if (
        ![
          "count",
          "histogram",
          "max",
          "mean",
          "median",
          "min",
          "mode",
          "modes",
          "range",
          "sum",
          "std",
          "variance",
          "uniques"
        ].includes(stat)
      ) {
        console.warn(`skipping unknown stat "${stat}"`);
      }
    });
    calcCount = stats.includes("count");
    calcHistogram = stats.includes("histogram");
    calcMax = stats.includes("max");
    calcMean = stats.includes("mean");
    calcMedian = stats.includes("median");
    calcMode = stats.includes("mode");
    calcModes = stats.includes("modes");
    calcRange = stats.includes("range");
    calcSum = stats.includes("sum");
    calcStd = stats.includes("std");
    calcVariance = stats.includes("variance");
    calcUniques = stats.includes("uniques");
  }

  const iter = getOrCreateIterator(data);

  let needCount = calcCount || calcMean || calcMedian || calcVariance || calcStd || typeof filter === "function";
  let needHistogram = calcHistogram || calcMedian || calcMode || calcModes || calcUniques;
  let needSum = calcSum || calcMean || calcVariance || calcStd;
  let needMin = calcMin || calcRange;
  let needMax = calcMax || calcRange;

  let count = 0;
  let index = 0;
  let min;
  let max;
  let sum = 0;
  const histogram = {};

  // after it processes filtering
  const process = value => {
    if (needCount) count++;
    if (needMin && (min === undefined || value < min)) min = value;
    if (needMax && (max === undefined || value > max)) max = value;
    if (needSum) sum += value;
    if (needHistogram) {
      if (value in histogram) histogram[value].ct++;
      else histogram[value] = { n: value, ct: 1 };
    }
  };

  let step;
  if (typeof noData === "number" && typeof filter === "function") {
    step = value => {
      index++;
      if (typeof value === "number" && value !== noData && filter({ count, index, value }) === true) {
        process(value);
      }
    };
  } else if (typeof noData === "number") {
    step = value => typeof value === "number" && value !== noData && process(value);
  } else if (typeof filter === "function") {
    step = value => {
      index++;
      if (typeof value === "number" && filter({ count, index, value }) === true) {
        process(value);
      }
    };
  } else {
    step = value => typeof value === "number" && process(value);
  }

  const finish = () => {
    const results = {};
    if (calcCount) results.count = count;
    if (calcMedian) results.median = fasterMedian({ counts: histogram, total: count });
    if (calcMin) results.min = min;
    if (calcMax) results.max = max;
    if (calcSum) results.sum = sum;
    if (calcRange) results.range = max - min;
    if (calcMean || calcVariance || calcStd) {
      const mean = sum / count;
      if (calcMean) results.mean = mean;
      if (calcVariance || calcStd) {
        const variance = computeVariance({ count, histogram, mean });
        if (calcVariance) results.variance = variance;
        if (calcStd) results.std = Math.sqrt(variance);
      }
    }
    if (calcHistogram) results.histogram = histogram;
    if (calcMode || calcModes) {
      let highest_count = 0;
      let modes = [];
      for (let key in histogram) {
        const { n, ct } = histogram[key];
        if (ct === highest_count) {
          modes.push(n);
        } else if (ct > highest_count) {
          highest_count = ct;
          modes = [n];
        }
      }

      if (calcModes) results.modes = modes;

      // compute mean value of all the most popular numbers
      if (calcMode) results.mode = modes.reduce((acc, n) => acc + n, 0) / modes.length;
    }
    if (calcUniques)
      results.uniques = Object.values(histogram)
        .map(({ n }) => n)
        .sort((a, b) => a - b);

    return results;
  };

  if (async) {
    return (async () => {
      for await (let value of iter) step(value);
      return finish();
    })();
  } else {
    for (let value of iter) step(value);
    return finish();
  }
}

module.exports = calcStats;
