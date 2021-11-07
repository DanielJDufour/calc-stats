const { getOrCreateIterator } = require("iter-fun");
const fasterMedian = require("faster-median");

function calcStats(
  data,
  {
    async = false,
    noData = undefined,
    filter = undefined,
    calcHistogram = true,
    calcMax = true,
    calcMean = true,
    calcMedian = true,
    calcMin = true,
    calcMode = true,
    calcModes = true,
    calcSum = true
  } = { debugLevel: 0 }
) {
  const iter = getOrCreateIterator(data);

  let needCount = calcMean || calcMedian || typeof filter === "function";
  let needHistogram = calcHistogram || calcMedian || calcMode || calcModes;
  let needSum = calcSum || calcMean;

  let count = 0;
  let index = 0;
  let min;
  let max;
  let sum = 0;
  const histogram = {};

  // after it processes filtering
  const process = value => {
    if (needCount) count++;
    if (calcMin && (min === undefined || value < min)) min = value;
    if (calcMax && (max === undefined || value > max)) max = value;
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
      if (value !== noData && filter({ count, index, value }) === true) {
        process(value);
      }
    };
  } else if (typeof noData === "number") {
    step = value => value !== noData && process(value);
  } else if (typeof filter === "function") {
    step = value => {
      index++;
      if (filter({ count, index, value }) === true) {
        process(value);
      }
    };
  } else {
    step = process;
  }

  const finish = () => {
    const results = {};
    if (calcMedian)
      results.median = fasterMedian({ counts: histogram, total: count });
    if (calcMin) results.min = min;
    if (calcMax) results.max = max;
    if (calcSum) results.sum = sum;
    if (calcMean) results.mean = sum / count;
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
      if (calcMode)
        results.mode = modes.reduce((acc, n) => acc + n, 0) / modes.length;
    }

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
