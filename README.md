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
    count: 4950,
    min: 1,
    max: 100,
    mean: 66.25,
    median: 70,
    mode: 95, // mean average of the most popular numbers
    modes: [90, 100], // all the most popular numbers
    range: 99, // the difference between max and min
    histogram: {
      '1': {
        n: 1, // numerical value
        ct: 10 // times that the value 1 appears
      },
      .
      .
      .
    },
    std: 23.44970978261541, // standard deviation
    sum: 328350, // sum of all the valid pixel values
    variance: 549.8888888888889, // variance of std calculation
    uniques: [1, 2, 3, 4, 5, ...] // sorted array of unique values (same as histogram keys)
  });
*/
```

# advanced usage
## no data value
If you want to ignore a certain number as a "No Data Value", pass in noData:
```js
const results = calcStats(data, { noData: -99 });
```

## asynchronous iterations
If you pass in an asynchronous iterable, such as one fetching remote image tiles,
you can transform calcStats to handle this by setting async to true.
```js
const results = await calcStats(datafetcher, { async: true });
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
