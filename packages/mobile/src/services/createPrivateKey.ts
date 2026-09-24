import { scryptAsync } from '@noble/hashes/scrypt'

/**
 * Given a user encryptStr and initialization vector, generate a private key
 * @param encryptStr String to encrypt (can be user password or some kind of lookup key)
 * @param ivHex hex string iv value
 */
export const createPrivateKey = async (encryptStr: string, ivHex: string) => {
  const N = 32768
  const r = 8
  const p = 1
  const dkLen = 32
  const encryptStrBuffer = Buffer.from(encryptStr)
  // NOTE: preserve the existing UTF-8 encoding of ivHex (no 'hex' arg) — the
  // salt is the bytes of the hex *string*, not the decoded hex. Changing this
  // would alter every derived wallet key.
  const ivBuffer = Buffer.from(ivHex)

  // scryptAsync runs in JS but yields to the event loop, keeping key
  // derivation off the critical path the way the old native module did.
  const keyBuffer = await scryptAsync(encryptStrBuffer, ivBuffer, {
    N,
    r,
    p,
    dkLen
  })
  const keyHex = Buffer.from(keyBuffer).toString('hex')

  return { keyHex, keyBuffer }
}
