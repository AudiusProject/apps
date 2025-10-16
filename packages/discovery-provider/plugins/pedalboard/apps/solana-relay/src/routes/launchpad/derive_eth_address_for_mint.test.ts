import { PublicKey } from '@solana/web3.js'
import { describe, it, expect } from 'vitest'
import * as Accounts from 'web3-eth-accounts'
import { toChecksumAddress } from 'web3-utils'

import { AUDIO_MINT } from './constants'
import { deriveEthAddressForMint } from './derive_eth_address_for_mint'

describe('deriveEthAddressForMint', () => {
  const DOMAIN = Buffer.from('audius/reward/claimauthority/v1')
  const OTHER_DOMAIN = Buffer.from('audius/reward/claimauthority/v2')

  const goodSecret = '0x' + '11'.repeat(32)
  const mintA = new PublicKey(AUDIO_MINT)
  const mintB = PublicKey.unique()

  it('throws when secret is not 32-byte hex', () => {
    expect(() => deriveEthAddressForMint(DOMAIN, '0x1234', mintA)).toThrow(
      /32-byte hex/i
    )
    expect(() => deriveEthAddressForMint(DOMAIN, 'not-hex', mintA)).toThrow(
      /32-byte hex/i
    )
    expect(() =>
      deriveEthAddressForMint(DOMAIN, '11'.repeat(32), mintA)
    ).not.toThrow()
  })

  it('is deterministic for same domain + secret + mint', () => {
    const r1 = deriveEthAddressForMint(DOMAIN, goodSecret, mintA)
    const r2 = deriveEthAddressForMint(DOMAIN, goodSecret, mintA)
    expect(r1.address).toBe(r2.address)
    expect(r1.privateKey).toBe(r2.privateKey)
  })

  it('produces different results for different mints', () => {
    const a = deriveEthAddressForMint(DOMAIN, goodSecret, mintA)
    const b = deriveEthAddressForMint(DOMAIN, goodSecret, mintB)
    expect(a.address).not.toBe(b.address)
    expect(a.privateKey).not.toBe(b.privateKey)
  })

  it('produces different results for different domains', () => {
    const r1 = deriveEthAddressForMint(DOMAIN, goodSecret, mintA)
    const r2 = deriveEthAddressForMint(OTHER_DOMAIN, goodSecret, mintA)
    expect(r1.address).not.toBe(r2.address)
    expect(r1.privateKey).not.toBe(r2.privateKey)
  })

  it('returns an EIP-55 checksummed address', () => {
    const { address } = deriveEthAddressForMint(DOMAIN, goodSecret, mintA)
    expect(address.startsWith('0x')).toBe(true)
    expect(address.length).toBe(42)
    const checksummed = toChecksumAddress(address.toLowerCase())
    expect(address).toBe(checksummed)
  })

  it('returns a 32-byte private key hex string with 0x prefix', () => {
    const { privateKey } = deriveEthAddressForMint(DOMAIN, goodSecret, mintA)
    expect(privateKey.startsWith('0x')).toBe(true)
    expect(privateKey.length).toBe(66)
    expect(/^[0-9a-fA-F]+$/.test(privateKey.slice(2))).toBe(true)
  })

  it('privateKey regenerates the exact same address via web3-eth-accounts', () => {
    const { address, privateKey } = deriveEthAddressForMint(
      DOMAIN,
      goodSecret,
      mintA
    )
    const addrFromPriv = Accounts.privateKeyToAccount(privateKey).address
    expect(addrFromPriv).toBe(address)
  })
})
