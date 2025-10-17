import { PublicKey } from '@solana/web3.js'
import keccak256 from 'keccak256'
import * as secp256k1 from 'secp256k1'
import { toChecksumAddress } from 'web3-utils'

/**
 * Derive a stable secp256k1 private key from (secret, mint)
 * and return both the ETH address (EIP-55) and private key (hex).
 * Uses keccak256(DOMAIN || secret || mint || ctr) and retries
 * with a tiny counter until valid.
 */
export const deriveEthAddressForMint = (
  domain: Buffer,
  secretHex: string,
  mint: PublicKey
): { address: string; privateKey: string } => {
  const h = secretHex.startsWith('0x') ? secretHex.slice(2) : secretHex
  if (h.length !== 64) throw new Error('secret must be 32-byte hex')
  const secret = Buffer.from(h, 'hex')

  const mintBytes = Buffer.from(mint.toBytes())
  for (let ctr = 0; ctr < 16; ctr++) {
    const data = Buffer.concat([domain, secret, mintBytes, Buffer.from([ctr])])
    const priv = Buffer.from(keccak256(data))
    if (!secp256k1.privateKeyVerify(priv)) continue

    // uncompressed public key (65 bytes, 0x04 + X(32) + Y(32))
    const pub = Buffer.from(secp256k1.publicKeyCreate(priv, false))
    const hash = keccak256(pub.slice(1)) // drop 0x04
    const addrLowerHex = '0x' + hash.slice(-20).toString('hex')
    const address = toChecksumAddress(addrLowerHex) // EIP-55
    const privateKey = '0x' + priv.toString('hex')
    return { address, privateKey }
  }
  throw new Error('Could not derive a valid secp256k1 key')
}
