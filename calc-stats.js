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
    calcInvalid = true,
    calcMax = true,
    calcMean = true,
    calcMedian = true,
    calcMin = true,
    calcMode = true,
    calcModes = true,
    calcRange = true,
    calcStd = true,
    calcSum = true,
    calcValid = true,
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
          "invalid",
          "max",
          "mean",
          "median",
          "min",
          "mode",
          "modes",
          "range",
          "sum",
          "std",
          "valid",
          "variance",
          "uniques"
        ].includes(stat)
      ) {
        console.warn(`[calc-stats] skipping unknown stat "${stat}"`);
      }
    });
    calcCount = stats.includes("count");
    calcHistogram = stats.includes("histogram");
    calcInvalid = stats.includes("invalid");
    calcMax = stats.includes("max");
    calcMean = stats.includes("mean");
    calcMedian = stats.includes("median");
    calcMin = stats.includes("min");
    calcMode = stats.includes("mode");
    calcModes = stats.includes("modes");
    calcRange = stats.includes("range");
    calcStd = stats.includes("std");
    calcSum = stats.includes("sum");
    calcValid = stats.includes("valid");
    calcVariance = stats.includes("variance");
    calcUniques = stats.includes("uniques");
  }

  const iter = getOrCreateIterator(data);

  let needHistogram = calcHistogram || calcMedian || calcMode || calcModes || calcVariance || calcStd || calcUniques;
  let needValid =
    calcCount || calcMean || calcMedian || calcValid || calcVariance || calcStd || typeof filter === "function";
  let needInvalid = calcCount || calcInvalid || typeof filter === "function";
  let needSum = calcSum || calcMean || calcVariance || calcStd;
  let needMin = calcMin || calcRange;
  let needMax = calcMax || calcRange;

  let valid = 0;
  let invalid = 0;
  let index = 0;
  let min;
  let max;
  let sum = 0;
  const histogram = {};

  // after it processes filtering
  const process = value => {
    if (needValid) valid++;
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
      if (typeof value === "number" && value !== noData && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof noData === "number") {
    step = value => {
      if (typeof value === "number" && value !== noData) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof filter === "function") {
    step = value => {
      index++;
      if (typeof value === "number" && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else {
    step = value => {
      if (typeof value === "number") {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  }

  const finish = () => {
    const results = {};
    if (calcCount) results.count = invalid + valid;
    if (calcValid) results.valid = valid;
    if (calcInvalid) results.invalid = invalid;
    if (calcMedian) results.median = fasterMedian({ counts: histogram, total: valid });
    if (calcMin) results.min = min;
    if (calcMax) results.max = max;
    if (calcSum) results.sum = sum;
    if (calcRange) results.range = max - min;
    if (calcMean || calcVariance || calcStd) {
      const mean = sum / valid;
      if (calcMean) results.mean = mean;
      if (calcVariance || calcStd) {
        const variance = computeVariance({ count: valid, histogram, mean });
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
