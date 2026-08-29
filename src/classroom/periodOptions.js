// Canonical list of class periods a teacher can assign to a class, in
// schedule order. Some periods run as combined blocks (e.g. "5/6").
// Edit this list to match the building's bell schedule.
export const PERIOD_OPTIONS = ['1', '2', '3', '5/6', '8/9', '10', '11'];

// Index of a period within PERIOD_OPTIONS, for sorting classes into
// schedule order. Unknown/legacy period values sort to the end.
export function periodSortIndex(period) {
  const i = PERIOD_OPTIONS.indexOf(String(period ?? ''));
  return i === -1 ? PERIOD_OPTIONS.length : i;
}

// Returns a new array of classes sorted into schedule order by period.
export function sortByPeriod(classes) {
  return [...classes].sort((a, b) => periodSortIndex(a.period) - periodSortIndex(b.period));
}
