import { Keypair, PublicKey } from '@solana/web3.js'
import { describe, expect, it } from 'vitest'

import { isSolanaPublicKeyString, SolanaAddressSchema } from './SolanaAddress'

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

const acceptedByWeb3 = (value: string) => {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(value)
    return true
  } catch {
    return false
  }
}

const programId = new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo')

const rng = (() => {
  let seed = 42
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
})()

const randomBase58 = (length: number) =>
  Array.from(
    { length },
    () => ALPHABET[Math.floor(rng() * ALPHABET.length)]
  ).join('')

const cases = [
  ...Array.from({ length: 20 }, () => Keypair.generate().publicKey.toBase58()),
  ...Array.from(
    { length: 10 },
    (_, i) =>
      PublicKey.findProgramAddressSync([Buffer.from(`seed-${i}`)], programId)[0]
  ).map((k) => k.toBase58()),
  '11111111111111111111111111111111',
  new PublicKey(
    new Uint8Array([0, 0, ...new Uint8Array(30).fill(7)])
  ).toBase58(),
  new PublicKey(new Uint8Array(32).fill(255)).toBase58().slice(0, -1),
  Keypair.generate().publicKey.toBase58() + '1',
  Keypair.generate().publicKey.toBase58() + 'z',
  '1' + Keypair.generate().publicKey.toBase58(),
  Keypair.generate().publicKey.toBase58().replace(/.$/, '0'),
  Keypair.generate().publicKey.toBase58().replace(/.$/, 'O'),
  Keypair.generate().publicKey.toBase58().replace(/.$/, 'I'),
  Keypair.generate().publicKey.toBase58().replace(/.$/, 'l'),
  Keypair.generate().publicKey.toBase58().replace(/.$/, '+'),
  ` ${Keypair.generate().publicKey.toBase58()}`,
  '0x5a9b1a5e9b5a7a1c0b5d8f1a2b3c4d5e6f7a8b9c',
  '',
  'abc',
  ...Array.from({ length: 2000 }, (_, i) => randomBase58(28 + (i % 20)))
]

describe('isSolanaPublicKeyString', () => {
  it('accepts and rejects the same strings as new PublicKey()', () => {
    const accepted = cases.filter(acceptedByWeb3)
    expect(accepted.length).toBeGreaterThan(30)
    expect(cases.length - accepted.length).toBeGreaterThan(30)
    for (const value of cases) {
      expect([value, isSolanaPublicKeyString(value)]).toEqual([
        value,
        acceptedByWeb3(value)
      ])
    }
  })
})

describe('SolanaAddressSchema', () => {
  it('accepts valid addresses including off-curve PDAs', () => {
    const pda = PublicKey.findProgramAddressSync(
      [Buffer.from('seed')],
      programId
    )[0].toBase58()
    expect(SolanaAddressSchema.safeParse(pda).success).toBe(true)
    expect(
      SolanaAddressSchema.safeParse(Keypair.generate().publicKey.toBase58())
        .success
    ).toBe(true)
  })

  it('rejects wrong lengths and invalid characters', () => {
    const key = Keypair.generate().publicKey.toBase58()
    expect(SolanaAddressSchema.safeParse(key + 'z').success).toBe(false)
    expect(SolanaAddressSchema.safeParse(key.slice(0, 31)).success).toBe(false)
    expect(SolanaAddressSchema.safeParse(key.replace(/.$/, '0')).success).toBe(
      false
    )
  })
})
