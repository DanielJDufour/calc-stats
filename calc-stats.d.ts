// export enum STATS_ENUM {
//   COUNT = "count",
//   HISTOGRAM = "histogram",
//   INVALID = "invalid",
//   MAX = "max",
//   MEAN = "mean",
//   MEDIAN = "median",
//   MIN = "min",
//   MODE = "mode",
//   MODES = "modes",
//   RANGE = "range",
//   SUM = "sum",
//   STD = "std",
//   VALID = "valid",
//   VARIANCE = "variance",
//   UNIQUES = "uniques"
// }

export type STAT =
  | "count"
  | "frequency"
  | "histogram"
  | "invalid"
  | "max"
  | "mean"
  | "median"
  | "min"
  | "mode"
  | "modes"
  | "product"
  | "range"
  | "sum"
  | "std"
  | "valid"
  | "variance"
  | "uniques";

// export type STATS = [STATS_ENUM.COUNT, STATS_ENUM.HISTOGRAM]

// export type Results = {
//   count?: number;
//   histogram?: {
//     [key: string]: {
//       n: number;
//       ct: number;
//     }
//   };
//   invalid?: number;
//   min?: number;
//   max?: number;
//   mean?: number;
//   median?: number;
//   mode?: number;
//   modes?: number[];
//   range?: number;
//   sum?: number;
//   std?: number;
//   valid?: number;
//   variance?: number;
//   uniques?: number[];
// };

// export type PreciseResults = {
//   count?: string;
//   histogram?: {
//     [key: string]: {
//       n: string;
//       ct: string;
//     }
//   };
//   invalid?: string;
//   min?: string;
//   max?: string;
//   mean?: string;
//   median?: string;
//   mode?: string;
//   modes?: string[];
//   range?: string;
//   sum?: string;
//   std?: string;
//   valid?: string;
//   variance?: string;
//   uniques?: string[];
// };

// type Result <T> = {
//   count: "count" extends T ? number : never;
//   histogram: T extends "histogram" ? {
//     [key: string]: {
//       n: number;
//       ct: number;
//     }
//   } : never;
//   invalid: T extends "invalid" ? number : never;
//   min: T extends "min" ? number : never;
//   max:  T extends "max" ? number : never;
//   mean: T extends "mean" ? number : never;
//   median: T extends "median" ? number : never;
//   mode: T extends "mode"  ? number : never;
//   modes: T extends "modes"  ? number[] : never;
//   range: T extends "range"  ? number : never;
//   sum: T extends "sum" ? number : never;
//   std: T extends "std" ? number : never;
//   valid: T extends "valid" ? number : never;
//   variance: T extends "variance"  ? number : never;
//   uniques: T extends "uniques" ? number[] : never;
// }

export default function calcStats(
  data: number[] | string[] | any,
  options?: {
    async?: boolean;
    chunked?: boolean;
    noData?: number | string | number[] | string[];
    filter?:
      | (({ valid, index, value }: { valid: number; index: number; value: number | string }) => boolean)
      | (({ value }: { value: number }) => boolean)
      | (({ value }: { value: string }) => boolean);
    precise?: boolean;
    precise_max_decimal_digits?: number;
    stats?: STAT[] | Readonly<STAT[]>;
  }
): any;

export function calcStats(
  data: number[] | string[] | any,
  options?: {
    async?: boolean;
    chunked?: boolean;
    noData?: number | string;
    filter?: ({ valid, index, value }: { valid: number; index: number; value: number | string }) => boolean;
    precise?: boolean;
    precise_max_decimal_digits?: number;
    stats?: STAT[] | Readonly<STAT[]>;
  }
): any;
