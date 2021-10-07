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
    min: 1,
    max: 100,
    mean: 66.25,
    median: 70,
    mode: 95, // mean average of the most popular numbers
    modes: [90, 100], // all the most popular numbers
    sum: 328350,
    histogram: {
      '1': {
        n: 1, // numerical value
        ct: 10 // times that the value 1 appears
      },
      .
      .
      .
    }
  });
*/
```

# advanced usage
If you only care about specific statistics, you can configure calcStats through an options object:
```js
import calcStats from "calc-stats";

// we only want the min and max
const options = {
  calcHistogram: false,
  calcMax: true,
  calcMean: false,
  calcMedian: false,
  calcMin: true,
  calcMode: false,
  calcModes: false,
  calcSum: false
};
const results = calcStats(data, options);
// results is { min: 1, max: 100 }
```
