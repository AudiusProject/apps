/**
 * Small helpers replacing lodash for tree-shaking / fewer deps / Node ESM interop.
 */

/** Picks only keys present on `obj` (like lodash `pick`). */
export function pick<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k]
    }
  }
  return out
}

/** Deduplicates by `iterateeKey` (first wins; like lodash `uniqBy`). */
export function uniqBy<T>(arr: readonly T[], iterateeKey: keyof T): T[] {
  const seen = new Set<unknown>()
  const out: T[] = []
  for (const item of arr) {
    const v = item[iterateeKey]
    if (seen.has(v)) continue
    seen.add(v)
    out.push(item)
  }
  return out
}
