import type { CreateKey, LocalStorage } from './types'

// https://stackoverflow.com/questions/38987784/how-to-convert-a-hexadecimal-string-to-uint8array-and-back-in-javascript
export function bufferFromHexString(hexString: string) {
  const byteArray = hexString
    .match(/.{1,2}/g)
    ?.map((byte) => parseInt(byte, 16))
  return new Uint8Array(byteArray as number[])
}

const HEX_CHARS = '0123456789abcdef'

export function bytesToHexString(bytes: Uint8Array) {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += HEX_CHARS[bytes[i] >> 4] + HEX_CHARS[bytes[i] & 15]
  }
  return hex
}

const hexDigit = (c: number) => {
  if (c >= 48 && c <= 57) return c - 48 // 0-9
  if (c >= 97 && c <= 102) return c - 87 // a-f
  if (c >= 65 && c <= 70) return c - 55 // A-F
  return -1
}

/**
 * Decodes hex the way Node's `Buffer.from(str, 'hex')` does: stops at the
 * first pair that is not two hex digits and drops a trailing odd nibble.
 */
export function hexToBytesLikeBuffer(hex: string) {
  const out = new Uint8Array(hex.length >> 1)
  let i = 0
  for (; i < out.length; i++) {
    const hi = hexDigit(hex.charCodeAt(i * 2))
    const lo = hexDigit(hex.charCodeAt(i * 2 + 1))
    if (hi < 0 || lo < 0) break
    out[i] = (hi << 4) | lo
  }
  return out.slice(0, i)
}

export function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

function isReactNativeEnv() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
}

function isWebEnv() {
  return (
    typeof window !== 'undefined' &&
    !!window &&
    !!window.Worker &&
    !isReactNativeEnv()
  )
}

export function getPlatformLocalStorage(): LocalStorage {
  if (isWebEnv()) {
    return window.localStorage
  }
  throw new Error(
    'Please pass in valid localStorage object into the Hedgehog constructor'
  )
}

/**
 * Default scrypt createKey. Runs on the calling thread, so web passes its own
 * worker-based createKey and mobile passes a native one.
 */
export function getPlatformCreateKey(): CreateKey {
  return async (encryptStr, ivHex) => {
    const { createKeyAsync } = await import('./scrypt')
    return await createKeyAsync(encryptStr, ivHex)
  }
}

/**
 * Resolves once `condition` returns true. Checks synchronously first so an
 * already-satisfied wait (the common case: every SDK request goes through
 * `hedgehog.waitUntilReady()` inside the request-signature mutex) does not
 * pay a 100ms poll tick and serialize requests behind it.
 */
export function waitUntil(condition: () => boolean) {
  if (condition()) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (!condition()) {
        return
      }

      clearInterval(interval)
      resolve()
    }, 100)
  })
}
