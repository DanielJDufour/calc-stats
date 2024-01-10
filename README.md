# calc-stats
> Memory-Aware Statistical Calculations

# motivation
I was looking for a way to calculate statistics for large grid files, including ASCII Grid, GeoTIFF, JPG, JPG2000, and PNG.
There were other solutions that worked on numerical arrays.
However, those didn't work for my use case because trying to put everything into one array would quickly drain my system's memory.
Additionally, some satellite imagery data is so large, it exceeds the maximum length allowed by most JavaScript engines.
I needed a solution that could stream the data.
However, the other streaming solutions I found, calculate the statistics after each number.
For my use case, I don't really care what the sum of half the points are.
I only really care about the stats at the end, for all the points.
Updating the statistics after each new number was wasted computations and slowed things down.  Ultimately, I found it easier to create a new library tailored towards large datasets.
Enjoy!

# install
```bash
npm install calc-stats
```

# basic usage
```javascript
import calcStats from "calc-stats";

// data can be an iterator with numerical values
// or something with a built-in iterator like an Array or TypedArray
const results = calcStats(data);
/*
  results is
  {
    count: 4950, // count of all values (valid and invalid)
    min: 1,
    max: 100,
    mean: 66.25,
    median: 70,
    mode: 95, // mean average of the most popular numbers
    modes: [90, 100], // all the most popular numbers
    range: 99, // the difference between max and min
    frequency: {
      "1": {
        "n": 1, // numerical value
        "freq": 0.00202020202020202 // how often the value appears
      },
      .
      .
      .
    },
    histogram: {
      "1": {
        "n": 1, // numerical value
        "ct": 10 // times that the value 1 appears
      },
      .
      .
      .
    },
    invalid: 0, // count of no-data and filtered out values
    product: Infinity, // use { precise: true } for a more accurate product
    std: 23.44970978261541, // standard deviation
    sum: 328350, // sum of all the valid numerical values
    valid: 4950, // count of valid numerical values
    variance: 549.8888888888889, // variance of std calculation
    uniques: [1, 2, 3, 4, 5, ...] // sorted array of unique values (same as histogram keys)
  });
*/
```

# advanced usage
## no data value
If you want to ignore one or more numbers as "No Data Value", pass in noData.  Non-numbers like `undefined`, `null`, or `""` are always treated as no data values, so you don't need to set noData if you just want to ignore those.

```js
calcStats(data, { noData: -99 });

// treat two numbers as noData values
calcStats(data, { noData: [-3.4e+38, -3.3999999521443642e+38] });
```

## asynchronous iterations
If you pass in an asynchronous iterable, such as one fetching remote image tiles,
you can transform calcStats to handle this by setting async to true.
```js
const results = await calcStats(datafetcher, { async: true });
``` 

## chunked
If your data is grouped into chunks or batches, but you want to process
them all as one group, pass `{ chunked: true }`.
```js
const rows = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];
calcStats(rows, { chunked: true, stats: ["min", "max"] });
{ min: 1, max: 9 }
```

## filtering
If you want to ignore some values, you can use a filter function:
```js
const results = calcStats(data, {
  filter: ({ index, value }) => {
    // ignore the first 10 numbers
    if (index < 10) return false;

    // ignore any negative numbers
    // or values greater than 100
    if (value < 0 && value > 100) return false;

    return true;
  }
})
```

## specify calculations
If you only care about specific statistics, you can pass in a stats array
```js
import calcStats from "calc-stats";

const results = calcStats(data, { stats: ["min", "max", "range"] });
// results is { min: 1, max: 100, range: 99 }
```

## precision
If you want super precise calculations avoiding floating-point arithmetic issues,
set precise to true.  Numerical results will be returned as strings to preserve precision.
Precise calculations are performed by [preciso](https://github.com/danieljdufour/preciso).
```js
import calcStats from "calc-stats";

const results = calcStats(data, { precise: true });
```

## timed
If you want to log how long it takes to calculate statistics,
set `{ timed: true }`;
```js
calcStats(data, { timed: true });
// [calc-stats] took 3 seconds
```
