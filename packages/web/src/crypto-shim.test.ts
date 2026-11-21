import { Buffer } from 'buffer'

import { describe, expect, it } from 'vitest'

import cryptoShim, { createHash, randomBytes } from './crypto-shim'

describe('crypto-shim', () => {
  it('returns a Buffer of the requested size', () => {
    const buf = randomBytes(32)
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf).toHaveLength(32)
    expect(buf!.readUInt8(0)).toBeTypeOf('number')
  })

  it('fills sizes above the getRandomValues limit', () => {
    const buf = randomBytes(65536 * 2 + 10)!
    expect(buf).toHaveLength(65536 * 2 + 10)
    expect(buf.subarray(65536 * 2).some((b) => b !== 0)).toBe(true)
  })

  it('supports the callback form', () => {
    let result: Buffer | undefined
    randomBytes(8, (err, buf) => {
      expect(err).toBeNull()
      result = buf
    })
    expect(result).toHaveLength(8)
  })

  it('exposes the same functions on the default export', () => {
    expect(cryptoShim.randomBytes).toBe(randomBytes)
    expect(cryptoShim.webcrypto).toBe(globalThis.crypto)
  })

  it('throws a clear error for unsupported Node APIs', () => {
    expect(() => createHash()).toThrow(/not available in the browser build/)
  })
})
