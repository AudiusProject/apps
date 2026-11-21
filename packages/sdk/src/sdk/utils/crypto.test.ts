import { randomBytes } from 'node:crypto'

import * as microAesGcm from 'micro-aes-gcm'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CryptoUtils } from './crypto'

const withFixedIv = async <T>(iv: Uint8Array, fn: () => Promise<T>) => {
  const spy = vi
    .spyOn(globalThis.crypto, 'getRandomValues')
    .mockImplementation(<A extends ArrayBufferView | null>(array: A) => {
      new Uint8Array(array!.buffer).set(iv)
      return array
    })
  try {
    return await fn()
  } finally {
    spy.mockRestore()
  }
}

const sizes = [0, 1, 15, 16, 17, 31, 32, 33, 64, 1000, 4096]

describe('CryptoUtils matches micro-aes-gcm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('produces identical ciphertext for the same key and IV', async () => {
    for (const size of sizes) {
      const key = new Uint8Array(randomBytes(32))
      const iv = new Uint8Array(randomBytes(12))
      const payload = new Uint8Array(randomBytes(size))
      const expected = await withFixedIv(iv, () =>
        microAesGcm.encrypt(key, payload)
      )
      const actual = await withFixedIv(iv, () =>
        CryptoUtils.encrypt(key, payload)
      )
      expect(actual).toEqual(expected)
      expect(actual.slice(0, 12)).toEqual(iv)
      expect(actual.length).toBe(12 + size + 16)
    }
  })

  it('uses the last 32 bytes of a longer secret, like before', async () => {
    const secret = new Uint8Array(randomBytes(33))
    const iv = new Uint8Array(randomBytes(12))
    const payload = new TextEncoder().encode('hello')
    const expected = await withFixedIv(iv, () =>
      microAesGcm.encrypt(secret.slice(1), payload)
    )
    const actual = await withFixedIv(iv, () =>
      CryptoUtils.encrypt(secret, payload)
    )
    expect(actual).toEqual(expected)
  })

  it('decrypts micro-aes-gcm output and vice versa', async () => {
    for (const size of sizes) {
      const secret = new Uint8Array(randomBytes(33))
      const key = secret.slice(1)
      const payload = new Uint8Array(randomBytes(size))

      const old = await microAesGcm.encrypt(key, payload)
      await expect(CryptoUtils.decrypt(secret, old)).resolves.toEqual(payload)

      const next = await CryptoUtils.encrypt(secret, payload)
      await expect(microAesGcm.decrypt(key, next)).resolves.toEqual(payload)
    }
  })

  it('round-trips strings', async () => {
    const secret = new Uint8Array(randomBytes(33))
    const message = 'gm 🌞 — ünïcödé'
    const encrypted = await CryptoUtils.encryptString(secret, message)
    await expect(CryptoUtils.decryptString(secret, encrypted)).resolves.toBe(
      message
    )
    const old = await microAesGcm.encrypt(
      secret.slice(1),
      new TextEncoder().encode(message)
    )
    await expect(CryptoUtils.decryptString(secret, old)).resolves.toBe(message)
  })

  it('rejects tampered ciphertext and wrong keys', async () => {
    const secret = new Uint8Array(randomBytes(32))
    const encrypted = await CryptoUtils.encrypt(
      secret,
      new Uint8Array(randomBytes(40))
    )
    const tampered = encrypted.slice()
    tampered[20]! ^= 1
    await expect(CryptoUtils.decrypt(secret, tampered)).rejects.toThrow()
    await expect(
      CryptoUtils.decrypt(new Uint8Array(randomBytes(32)), encrypted)
    ).rejects.toThrow()
  })

  it('rejects secrets shorter than 32 bytes, like before', async () => {
    const short = new Uint8Array(randomBytes(31))
    await expect(
      microAesGcm.encrypt(short, new Uint8Array(1))
    ).rejects.toThrow()
    await expect(
      CryptoUtils.encrypt(short, new Uint8Array(1))
    ).rejects.toThrow()
  })
})
