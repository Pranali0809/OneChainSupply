// Shared economic constants so every surface derives dollars the same way.
export const CASE_VALUE = 92; // $ per case, used for all waste $ math
export const BASELINE_KPI = {
  fillRate: 97.4,
  projectedWasteCases: 18420,
  projectedWasteDollars: 18420 * CASE_VALUE, // 1,694,640
  freightCost: 3_420_000,
  workingCapital: 12_100_000,
  expediteCost: 95_000,
};
