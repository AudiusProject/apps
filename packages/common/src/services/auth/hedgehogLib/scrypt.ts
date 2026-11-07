import { scrypt, scryptAsync } from '@noble/hashes/scrypt'
import { bytesToHex } from '@noble/hashes/utils'

import type { PrivateKey } from './types'

// Changing these params or how the inputs are encoded changes every user's key.
// The ivHex string itself (its utf8 bytes, not the decoded hex) is the salt.
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, dkLen: 32 }

const encoder = new TextEncoder()

const toPrivateKey = (keyBuffer: Uint8Array): PrivateKey => ({
  keyHex: bytesToHex(keyBuffer),
  keyBuffer
})

/** Blocks for about a second. Only call this off the main thread. */
export const createKeySync = (encryptStr: string, ivHex: string) =>
  toPrivateKey(
    scrypt(encoder.encode(encryptStr), encoder.encode(ivHex), SCRYPT_PARAMS)
  )

export const createKeyAsync = async (encryptStr: string, ivHex: string) =>
  toPrivateKey(
    await scryptAsync(
      encoder.encode(encryptStr),
      encoder.encode(ivHex),
      SCRYPT_PARAMS
    )
  )
