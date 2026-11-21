import { scrypt, scryptAsync } from '@noble/hashes/scrypt'
import { bytesToHex } from '@noble/hashes/utils'

import type { PrivateKey } from './types'

const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, dkLen: 32 }

const encoder = new TextEncoder()

const toPrivateKey = (keyBuffer: Uint8Array): PrivateKey => ({
  keyHex: bytesToHex(keyBuffer),
  keyBuffer
})

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
