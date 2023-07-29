const { getOrCreateIterator } = require("iter-fun");
const { add, compare, divide, mean, multiply, pow, sort, subtract, sum } = require("preciso");
const mediana = require("mediana");

const computeVariance = ({ count, histogram, mean_value, precise = false }) => {
  if (precise) {
    mean_value = mean_value.toString();
    const reduced = Object.values(histogram).reduce((sum, { n, ct }) => {
      const diff = subtract(n.toString(), mean_value);
      return add(sum, multiply(ct.toString(), pow(diff, "2")));
    }, "0");
    return divide(reduced, count.toString());
  } else {
    return (
      Object.values(histogram).reduce((sum, { n, ct }) => {
        return sum + ct * Math.pow(n - mean_value, 2);
      }, 0) / count
    );
  }
};

function calcStats(
  data,
  {
    async = false,
    chunked = false,
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
    calcProduct = true,
    calcRange = true,
    calcStd = true,
    calcSum = true,
    calcValid = true,
    calcVariance = true,
    calcUniques = true,
    precise = false,
    precise_max_decimal_digits = 100,
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
          "product",
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
    calcProduct = stats.includes("product");
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
    calcCount ||
    calcMean ||
    calcMedian ||
    calcProduct ||
    calcValid ||
    calcVariance ||
    calcStd ||
    typeof filter === "function";
  let needInvalid = calcCount || calcInvalid || typeof filter === "function";
  let needSum = calcSum || calcMean || calcVariance || calcStd;
  let needMin = calcMin || calcRange;
  let needMax = calcMax || calcRange;
  let needProduct = calcProduct;
  let valid = 0;
  let invalid = 0;
  let index = 0;
  let min;
  let max;
  let product;
  let sum = precise ? "0" : 0;
  const histogram = {};

  // after it processes filtering
  let process;
  if (precise) {
    process = value => {
      value = value.toString();
      if (needValid) valid++;
      if (needMin && (min === undefined || compare(value, min) === "<")) min = value;
      if (needMax && (max === undefined || compare(value, max) === ">")) max = value;
      if (needProduct) product = valid === 1 ? value : multiply(product, value);
      if (needSum) sum = add(sum, value);
      if (needHistogram) {
        if (value in histogram) histogram[value].ct++;
        else histogram[value] = { n: value.toString(), ct: 1 };
      }
    };
  } else {
    process = value => {
      if (needValid) valid++;
      if (needMin && (min === undefined || value < min)) min = value;
      if (needMax && (max === undefined || value > max)) max = value;
      if (needProduct) product = valid === 1 ? value : product * value;
      if (needSum) sum += value;
      if (needHistogram) {
        if (value in histogram) histogram[value].ct++;
        else histogram[value] = { n: value, ct: 1 };
      }
    };
  }

  let step;
  if (typeof noData === "number" && typeof filter === "function") {
    step = value => {
      index++;
      if (typeof value === "number" && !isNaN(value) && value !== noData && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof noData === "number") {
    step = value => {
      if (typeof value === "number" && !isNaN(value) && value !== noData) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof filter === "function") {
    step = value => {
      index++;
      if (typeof value === "number" && !isNaN(value) && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else {
    step = value => {
      if (typeof value === "number" && !isNaN(value)) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  }

  const finish = () => {
    const results = {};
    if (calcCount) results.count = precise ? add(invalid.toString(), valid.toString()) : invalid + valid;
    if (calcValid) results.valid = precise ? valid.toString() : valid;
    if (calcInvalid) results.invalid = precise ? invalid.toString() : invalid;
    if (calcMedian) {
      results.median = mediana.calculate({ counts: histogram, precise, total: valid });
    }
    if (calcMin) results.min = min; // should already be a string if precise
    if (calcMax) results.max = max; // should already be a string if precise
    if (calcProduct) results.product = product; // should already be a string if precise
    if (calcSum) results.sum = sum; // should already be a string if precise
    if (calcRange) results.range = precise ? subtract(max.toString(), min.toString()) : max - min;
    if (calcMean || calcVariance || calcStd) {
      const mean_value = precise
        ? divide(sum, valid.toString(), { max_decimal_digits: precise_max_decimal_digits })
        : sum / valid;
      if (calcMean) results.mean = mean_value;
      if (calcVariance || calcStd) {
        const variance = computeVariance({ count: valid, histogram, mean_value, precise });
        if (calcVariance) results.variance = variance;
        if (calcStd) results.std = precise ? Math.sqrt(Number(variance)).toString() : Math.sqrt(variance);
      }
    }
    if (calcHistogram) {
      if (precise) {
        Object.values(histogram).forEach(obj => {
          obj.ct = obj.ct.toString();
        });
      }
      results.histogram = histogram;
    }
    if (calcMode || calcModes) {
      let highest_count = 0;
      let modes = [];
      for (let key in histogram) {
        const { n, ct } = histogram[key];
        if (ct === highest_count) {
          modes.push(precise ? n.toString() : n);
        } else if (ct > highest_count) {
          highest_count = ct;
          modes = [precise ? n.toString() : n];
        }
      }

      if (calcModes) results.modes = modes;

      // compute mean value of all the most popular numbers
      if (calcMode) {
        results.mode = precise ? mean(modes) : modes.reduce((acc, n) => acc + n, 0) / modes.length;
      }
    }
    if (calcUniques) {
      if (precise) {
        results.uniques = sort(Object.keys(histogram));
      } else {
        results.uniques = Object.values(histogram)
          .map(({ n }) => n)
          .sort((a, b) => a - b);
      }
    }

    return results;
  };

  if (chunked) {
    if (async) {
      return (async () => {
        for await (let value of iter) {
          for (let v of value) {
            step(v);
          }
        }
        return finish();
      })();
    } else {
      for (let value of iter) {
        for (let v of value) {
          step(v);
        }
      }
      return finish();
    }
  } else {
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
}

if (typeof define === "function" && define.amd) {
  define(function () {
    return calcStats;
  });
}

if (typeof module === "object") {
  module.exports = calcStats;
  module.exports.default = calcStats;
  module.exports.calcStats = calcStats;
}

if (typeof self === "object") {
  self.calcStats = calcStats;
}

if (typeof window === "object") {
  window.calcStats = calcStats;
}
