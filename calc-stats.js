const fasterMedian = require("faster-median");

const isArray = (data) => {
  try {
    return data.constructor.name.endsWith("Array");
  } catch {
    return false;
  }
};

const hasNext = (data) => {
  try {
    return typeof data.next === "function";
  } catch {
    return false;
  }
};

const hasIterator = (data) => {
  try {
    return "@@iterator" in data;
  } catch {
    return false;
  }
};

const hasSymbolIterator = (data) => {
  try {
    return Symbol.iterator in data.constructor.prototype;
  } catch {
    return false;
  }
};

const getIterator = (data) => {
  const iter = data["@@iterator"];
  if (hasNext(iter)) {
    return iter;
  } else if (typeof iter === "function") {
    return iter();
  }
};

const createIterator = (data) => {
  let i = 0;
  let len = data.length;
  return {
    next: () => (i++ < len ? { value: data[i], done: false } : { done: true }),
  };
};

function calcStats(
  data,
  {
    calcHistogram = true,
    calcMax = true,
    calcMean = true,
    calcMedian = true,
    calcMin = true,
    calcMode = true,
    calcModes = true,
    calcSum = true,
  } = { debugLevel: 0 }
) {
  let iter;

  if (hasNext(data)) {
    iter = data;
  } else if (hasSymbolIterator(data)) {
    iter = data[Symbol.iterator]();
  } else if (hasIterator(data)) {
    iter = getIterator(data);
  } else if (typeof data === "string" || isArray(data)) {
    iter = createIterator(data);
  } else {
    throw "[calc-stats] unable to determine iterator";
  }

  let needCount = calcMean || calcMedian;
  let needHistogram = calcHistogram || calcMedian || calcMode || calcModes;
  let needSum = calcSum || calcMean;

  let count = 0;
  let min;
  let max;
  let sum = 0;
  const histogram = {};

  let obj;
  while (((obj = iter.next()), obj.done === false)) {
    if (needCount) count++;
    const { value } = obj;
    if (calcMin && (min === undefined || value < min)) min = value;
    if (calcMax && (max === undefined || value > max)) max = value;
    if (needSum) sum += value;
    if (needHistogram) {
      if (value in histogram) histogram[value].ct++;
      else histogram[value] = { n: value, ct: 1 };
    }
  }
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
}

module.exports = calcStats;
