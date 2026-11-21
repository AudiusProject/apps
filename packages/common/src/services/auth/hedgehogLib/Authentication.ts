import { cbc } from '@noble/ciphers/aes'
import { sha256 } from 'viem'
import { english, mnemonicToAccount } from 'viem/accounts'

import { HedgehogWallet } from './HedgehogWallet'
import {
  bufferFromHexString,
  bytesToHexString,
  hexToBytesLikeBuffer,
  randomBytes
} from './utils'

const encryptPrefixStr = 'hedgehog-entropy:::'

const ENTROPY_BYTES = 16

export function entropyToMnemonic(entropy: string) {
  const bytes = hexToBytesLikeBuffer(entropy)
  if (bytes.length < 16 || bytes.length > 32 || bytes.length % 4 !== 0) {
    throw new TypeError('Invalid entropy')
  }
  const checksum = sha256(bytes, 'bytes')
  const checksumBits = bytes.length / 4
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  for (const b of checksum) bits += b.toString(2).padStart(8, '0')
  bits = bits.slice(0, bytes.length * 8 + checksumBits)

  const words: string[] = []
  for (let i = 0; i < bits.length; i += 11) {
    words.push(english[parseInt(bits.slice(i, i + 11), 2)])
  }
  return words.join(' ')
}

export class Authentication {
  static async generateWalletFromEntropy(entropy: string, path: string) {
    const mnemonic = entropyToMnemonic(entropy)
    const account = mnemonicToAccount(mnemonic, {
      path: path as `m/44'/60'/${string}`
    })
    const privateKey = account.getHdKey().privateKey
    if (!privateKey) {
      throw new Error('Could not derive private key')
    }
    return new HedgehogWallet(privateKey, account.publicKey, account.address)
  }

  static generateMnemonicAndEntropy() {
    const entropy = bytesToHexString(randomBytes(ENTROPY_BYTES))
    const mnemonic = entropyToMnemonic(entropy)
    return { mnemonic, entropy }
  }

  static createIV() {
    const ivBuffer = randomBytes(16)
    const ivHex = bytesToHexString(ivBuffer)
    return { ivHex, ivBuffer }
  }

  static encrypt(entropy: string, ivBuffer: Uint8Array, keyBuffer: Uint8Array) {
    const plainText = new TextEncoder().encode(encryptPrefixStr + entropy)
    const cipherText = cbc(keyBuffer, ivBuffer).encrypt(plainText)
    const cipherTextHex = bytesToHexString(cipherText)
    return { cipherText, cipherTextHex }
  }

  static decrypt(
    ivBuffer: Uint8Array,
    keyBuffer: Uint8Array,
    cipherTextHex: string
  ) {
    const cipherText = bufferFromHexString(cipherTextHex)
    const decrypted = cbc(keyBuffer, ivBuffer).decrypt(cipherText)
    return verifyDecryptString(decrypted)
  }
}

function verifyDecryptString(decrypted: Uint8Array) {
  const decryptedEntropy = new TextDecoder('utf-8', { ignoreBOM: true }).decode(
    decrypted
  )
  if (decryptedEntropy && decryptedEntropy.indexOf(encryptPrefixStr) === 0) {
    return decryptedEntropy.split(encryptPrefixStr)[1] as string
  } else throw new Error('Could not verify integrity of decrypted string')
}
