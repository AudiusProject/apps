import { randomBytes } from 'node:crypto'

import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import * as legacySecp from '@noble/secp256k1'
import { bytesToHex, type Hex } from 'viem'
import { describe, expect, it } from 'vitest'

import { privateKeyToAudiusAccount } from './privateKeyToAudiusAccount'

const randomKey = () => {
  for (;;) {
    const key = new Uint8Array(randomBytes(32))
    if (legacySecp.utils.isValidPrivateKey(key)) return key
  }
}

describe('privateKeyToAudiusAccount matches @noble/secp256k1', () => {
  it('signRaw returns the same compact signature and recovery id', async () => {
    for (let i = 0; i < 50; i++) {
      const privateKey = randomKey()
      const account = privateKeyToAudiusAccount(bytesToHex(privateKey))
      const data = bytesToHex(randomBytes(1 + (i % 100))) as Hex

      const expected = await legacySecp.sign(
        keccak_256(Buffer.from(data.slice(2), 'hex')),
        privateKey,
        { recovered: true, der: false }
      )
      const actual = await account.signRaw(data)
      expect(actual[0]).toEqual(expected[0])
      expect(actual[1]).toBe(expected[1])
    }
  })

  it('getSharedSecret matches for compressed, uncompressed and hex keys', async () => {
    for (let i = 0; i < 25; i++) {
      const privateKey = randomKey()
      const other = randomKey()
      const account = privateKeyToAudiusAccount(bytesToHex(privateKey))
      const compressed = legacySecp.getPublicKey(other, true)
      const uncompressed = legacySecp.getPublicKey(other, false)
      const expected = legacySecp.getSharedSecret(
        privateKey,
        uncompressed,
        true
      )
      expect(expected).toHaveLength(33)

      await expect(account.getSharedSecret(uncompressed)).resolves.toEqual(
        expected
      )
      await expect(account.getSharedSecret(compressed)).resolves.toEqual(
        expected
      )
      await expect(
        account.getSharedSecret(Buffer.from(uncompressed).toString('hex'))
      ).resolves.toEqual(expected)
      expect(
        legacySecp.getSharedSecret(
          other,
          legacySecp.getPublicKey(privateKey),
          true
        )
      ).toEqual(expected)
    }
  })

  it('randomPrivateKey yields keys the legacy library accepts', () => {
    for (let i = 0; i < 50; i++) {
      const key = secp256k1.utils.randomPrivateKey()
      expect(key).toHaveLength(32)
      expect(legacySecp.utils.isValidPrivateKey(key)).toBe(true)
    }
  })
})
