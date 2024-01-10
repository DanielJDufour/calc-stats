const { getOrCreateIterator } = require("iter-fun");
const { add, compare, divide, mean, multiply, pow, round, sort, subtract, sum } = require("preciso");
const mediana = require("mediana");

// n === n is a lot quicker than !isNaN(n)
const isValidNumber = n => typeof n === "number" && n === n;

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
    map,
    calcCount = true,
    calcFrequency = true,
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
    stats,
    timed = false
  } = { debugLevel: 0 }
) {
  const start = timed ? performance.now() : 0;

  if (stats) {
    // validate stats argument
    stats.forEach(stat => {
      if (
        ![
          "count",
          "frequency",
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
    calcFrequency = stats.includes("frequency");
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

  if (typeof map === "string") {
    const key = map;
    map = it => it[key];
  }

  const iter = getOrCreateIterator(data);

  let needHistogram =
    calcFrequency || calcHistogram || calcMedian || calcMode || calcModes || calcVariance || calcStd || calcUniques;
  let needValid =
    calcCount ||
    calcFrequency ||
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

  // hoisting functions outside of conditionals
  // in order to help compilers optimize
  const initial_process = value => {
    if (needValid) valid = 1;
    if (needMin) min = value;
    if (needMax) max = value;
    if (needProduct) product = value;
    if (needSum) sum = value;
    if (needHistogram) {
      histogram[value] = { n: value, ct: 1 };
    }
    process = subsequent_process;
  };

  const subsequent_process = value => {
    if (needValid) valid++;
    if (needMin && value < min) min = value;
    if (needMax && value > max) max = value;
    if (needProduct) product *= value;
    if (needSum) sum += value;
    if (needHistogram) {
      if (value in histogram) histogram[value].ct++;
      else histogram[value] = { n: value, ct: 1 };
    }
  };

  if (precise) {
    process = value => {
      value = value.toString();
      if (needValid) valid++;
      if (needMin && (typeof min === "undefined" || compare(value, min) === "<")) min = value;
      if (needMax && (typeof max === "undefined" || compare(value, max) === ">")) max = value;
      if (needProduct) {
        product = valid === 1 ? value : multiply(product, value, { max_decimal_digits: precise_max_decimal_digits });
      }
      if (needSum) sum = add(sum, value);
      if (needHistogram) {
        if (value in histogram) histogram[value].ct++;
        else histogram[value] = { n: value.toString(), ct: 1 };
      }
    };
  } else {
    process = initial_process;
  }

  let step;
  if (typeof noData === "number" && typeof filter === "function") {
    step = value => {
      index++;
      if (isValidNumber(value) && value !== noData && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof noData === "number") {
    step = value => {
      if (isValidNumber(value) && value !== noData) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (Array.isArray(noData) && noData.length > 0 && typeof filter === "function") {
    step = value => {
      index++;
      if (isValidNumber(value) && !noData.includes(value) && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (Array.isArray(noData) && noData.length > 0) {
    step = value => {
      if (isValidNumber(value) && !noData.includes(value)) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof filter === "function") {
    step = value => {
      index++;
      if (isValidNumber(value) && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else {
    step = value => {
      if (isValidNumber(value)) {
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
        let variance = computeVariance({
          count: valid,
          histogram,
          // want enough precision, so we can get a good standard deviation later
          max_decimal_digits:
            typeof precise_max_decimal_digits === "number" && precise_max_decimal_digits < 20
              ? 20
              : precise_max_decimal_digits,
          mean_value,
          precise
        });
        if (calcVariance) {
          results.variance =
            precise && typeof precise_max_decimal_digits === "number"
              ? round(variance, { digits: precise_max_decimal_digits })
              : variance;
        }
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
    if (calcFrequency) {
      const frequency = {};
      if (precise) {
        const valid_as_string = valid.toString();
        for (let key in histogram) {
          const obj = histogram[key];
          frequency[key] = {
            n: obj.n.toString(),
            freq: divide(obj.ct, valid_as_string, { max_decimal_digits: precise_max_decimal_digits })
          };
        }
      } else {
        for (let key in histogram) {
          const obj = histogram[key];
          frequency[key] = {
            n: obj.n,
            freq: obj.ct / valid
          };
        }
      }
      results.frequency = frequency;
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
    if (timed) {
      const duration = Math.round(performance.now() - start);
      if (duration > 2000) {
        console.log("[calc-stats] took " + Math.round(duration / 1000).toLocaleString() + " seconds");
      } else {
        console.log("[calc-stats] took " + duration.toLocaleString() + " milliseconds");
      }
    }
    return results;
  };

  if (chunked) {
    if (async) {
      return (async () => {
        for await (let value of iter) {
          for (let v of value) {
            if (map) v = map(v);
            step(v);
          }
        }
        return finish();
      })();
    } else {
      // array of arrays or array of typed arrays
      if (Array.isArray(data) && data[0].length) {
        for (let i = 0; i < data.length; i++) {
          const value = data[i];
          for (let ii = 0; ii < value.length; ii++) {
            let v = value[ii];
            if (map) v = map(v);
            step(v);
          }
        }
      } else {
        for (let value of iter) {
          for (let v of value) {
            if (map) v = map(v);
            step(v);
          }
        }
      }
      return finish();
    }
  } else {
    if (async) {
      return (async () => {
        for await (let value of iter) {
          if (map) value = map(value);
          step(value);
        }
        return finish();
      })();
    } else {
      for (let value of iter) {
        if (map) value = map(value);
        step(value);
      }
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
