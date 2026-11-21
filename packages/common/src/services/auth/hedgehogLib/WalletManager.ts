import { Authentication } from './Authentication'
import type { CreateKey, LocalStorage } from './types'
import { bufferFromHexString } from './utils'

const PATH = "m/44'/60'/0'/0/0"
const hedgehogEntropyKey = 'hedgehog-entropy-key'

export class WalletManager {
  static async createWalletObj(
    password: string,
    entropyOverride: string | null = null,
    localStorage: LocalStorage,
    createKey: CreateKey
  ) {
    let entropy: string

    if (!password) return new Error('Missing property: password')

    const { ivBuffer, ivHex } = Authentication.createIV()
    const { keyBuffer } = await createKey(password, ivHex)
    if (!entropyOverride) {
      entropy = Authentication.generateMnemonicAndEntropy().entropy
    } else {
      entropy = entropyOverride
    }
    const walletObj = await Authentication.generateWalletFromEntropy(
      entropy,
      PATH
    )
    const { cipherTextHex } = Authentication.encrypt(
      entropy,
      ivBuffer,
      keyBuffer
    )

    await WalletManager.setEntropyInLocalStorage(entropy, localStorage)
    return {
      ivHex,
      cipherTextHex,
      walletObj,
      entropy
    }
  }

  static async decryptCipherTextAndRetrieveWallet(
    password: string,
    ivHex: string,
    cipherTextHex: string,
    createKey: CreateKey
  ) {
    const { keyBuffer } = await createKey(password, ivHex)
    const ivBuffer = bufferFromHexString(ivHex)
    const decryptedEntropy = Authentication.decrypt(
      ivBuffer,
      keyBuffer,
      cipherTextHex
    )
    const walletObj = await Authentication.generateWalletFromEntropy(
      decryptedEntropy,
      PATH
    )

    return { walletObj, entropy: decryptedEntropy }
  }

  static async createAuthLookupKey(
    username: string,
    password: string,
    createKey: CreateKey
  ) {
    username = username.toLowerCase()
    const ivHex = '0x4f7242b39969c3ac4c6712524d633ce9'
    const { keyHex } = await createKey(username + ':::' + password, ivHex)
    return keyHex
  }

  static async getEntropyFromLocalStorage(localStorage: LocalStorage) {
    const entropy = await localStorage.getItem(hedgehogEntropyKey)

    if (entropy && entropy !== 'undefined') {
      return entropy
    } else return null
  }

  static async getWalletObjFromLocalStorageIfExists(
    localStorage: LocalStorage
  ) {
    const entropy = await WalletManager.getEntropyFromLocalStorage(localStorage)
    if (entropy) {
      const walletObj = await Authentication.generateWalletFromEntropy(
        entropy,
        PATH
      )
      return walletObj ?? null
    } else return null
  }

  static async setEntropyInLocalStorage(
    entropy: string,
    localStorage: LocalStorage
  ) {
    await localStorage.setItem(hedgehogEntropyKey, entropy)
  }

  static async deleteEntropyFromLocalStorage(localStorage: LocalStorage) {
    await localStorage.removeItem(hedgehogEntropyKey)
  }
}
