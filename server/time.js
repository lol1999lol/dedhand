export function computeDeadline(intervalMs, from = Date.now()) {
  return from + intervalMs;
}
