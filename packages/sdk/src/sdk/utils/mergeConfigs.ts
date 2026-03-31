/**
 * Plain objects only (Object.prototype or null proto). Class instances (Logger, etc.)
 * are not plain and must not be structuredClone'd or deep-merged (would strip prototypes).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

/**
 * Deep-clone plain objects and arrays for immutable defaults. Keeps class instances
 * by reference so methods like Logger#createPrefixedLogger remain.
 */
function cloneConfigDefaults(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((item) => cloneConfigDefaults(item))
  }
  if (!isPlainObject(value)) {
    return value
  }
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(value)) {
    out[k] = cloneConfigDefaults(
      (value as Record<string, unknown>)[k]
    ) as unknown
  }
  return out
}

function mergeRec(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target }
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = result[key]
    if (Array.isArray(sv)) {
      result[key] = sv
    } else if (isPlainObject(sv) && isPlainObject(tv)) {
      result[key] = mergeRec(tv, sv)
    } else {
      result[key] = sv
    }
  }
  return result
}

/**
 * Merges `config` over `defaults`. Arrays on `config` replace entirely (lodash mergeWith behavior).
 * Only plain objects are deep-merged; class instances are replaced as a whole.
 */
export const mergeConfigWithDefaults = <T, K>(config: T, defaults: K) => {
  const base = cloneConfigDefaults(defaults) as Record<string, unknown>
  return mergeRec(base, config as Record<string, unknown>) as T & K
}
