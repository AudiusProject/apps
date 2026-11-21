export function applyHermesErrorStackPolyfill(): void {
  if (typeof global === 'undefined') {
    return
  }

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
