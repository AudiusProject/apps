import { NativeModules, Platform } from 'react-native'
import { scrypt as fastCryptoScrypt } from 'react-native-fast-crypto'

const scrypt = async (
  passwd: Uint8Array,
  salt: Uint8Array,
  N: number,
  r: number,
  p: number,
  dkLen: number
): Promise<Uint8Array> => {
  // react-native-fast-crypto's prebuilt Android library logs the password,
  // so Android derives keys in the app's own AudiusScrypt module. Older
  // binaries without the module still use fast-crypto.
  const { AudiusScrypt } = NativeModules
  if (Platform.OS === 'android' && AudiusScrypt) {
    const keyBase64: string = await AudiusScrypt.scrypt(
      Buffer.from(passwd).toString('base64'),
      Buffer.from(salt).toString('base64'),
      N,
      r,
      p,
      dkLen
    )
    return new Uint8Array(Buffer.from(keyBase64, 'base64'))
  }
  return await fastCryptoScrypt(passwd, salt, N, r, p, dkLen)
}

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
  const ivBuffer = Buffer.from(ivHex)

  const keyBuffer = await scrypt(encryptStrBuffer, ivBuffer, N, r, p, dkLen)
  const keyHex = Buffer.from(keyBuffer).toString('hex')

  return { keyHex, keyBuffer }
}
