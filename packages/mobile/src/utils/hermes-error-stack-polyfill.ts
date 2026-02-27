/**
 * Hermes Engine Error.stack Polyfill for React Native 0.78.x
 *
 * Fixes the "Error.stack getter called with an invalid receiver" bug that occurs
 * when libraries use non-standard error inheritance patterns (e.g. Object.create(Error.prototype)
 * or prototype = new Error). Hermes throws when accessing .stack on these objects.
 *
 * References:
 * - https://github.com/facebook/react-native/issues/43636
 * - https://github.com/facebook/hermes/issues/1496
 * - https://github.com/facebook/hermes/pull/1621
 */
export function applyHermesErrorStackPolyfill(): void {
  if (typeof global === 'undefined') {
    return
  }

  // Only apply polyfill when running on Hermes engine
  const hermesInternal = (global as unknown as { HermesInternal?: unknown })
    .HermesInternal
  if (!hermesInternal) {
    return
  }

  const descriptor = Object.getOwnPropertyDescriptor(Error.prototype, 'stack')
  const originalGetter = descriptor?.get
  if (!originalGetter) {
    return
  }

  // Intentional polyfill for Hermes - must modify Error.prototype to fix invalid receiver
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Error.prototype, 'stack', {
    get: function () {
      try {
        return originalGetter!.call(this)
      } catch {
        const message =
          this && typeof this === 'object' && 'message' in this
            ? String((this as { message: unknown }).message)
            : 'Unknown error'
        return `Error: ${message}\n at (Hermes stack unavailable)`
      }
    },
    configurable: true
  })
}
