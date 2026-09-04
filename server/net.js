export async function http(url, opts = {}, ms = 45000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

export async function retry(fn, tries = 4) {
  let last;
  for (let i = 0; i < tries; i += 1) {
    try {
      return await fn(i);
    } catch (err) {
      last = err;
      await sleep(700 * 2 ** i);
    }
  }
  throw last;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function chatIds(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function debug(...args) {
  if (process.env.DEDHAND_DEBUG) console.error(...args);
}
