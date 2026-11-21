import { WalletManager } from './WalletManager'
import type {
  ChangeCredentialsArgs,
  CreateKey,
  EthWallet,
  GetFn,
  LocalStorage,
  LoginArgs,
  SetAuthFn,
  SetUserFn
} from './types'
import {
  getPlatformCreateKey,
  getPlatformLocalStorage,
  waitUntil
} from './utils'

export class Hedgehog {
  getFn: GetFn
  setAuthFn: SetAuthFn
  setUserFn: SetUserFn
  wallet: null | EthWallet
  localStorage: LocalStorage
  createKey: CreateKey
  ready: boolean

  constructor(
    getFn?: GetFn,
    setAuthFn?: SetAuthFn,
    setUserFn?: SetUserFn,
    useLocalStorage = true,
    localStorage: LocalStorage = getPlatformLocalStorage(),
    createKey: CreateKey = getPlatformCreateKey()
  ) {
    if (!getFn || !setAuthFn || !setUserFn) {
      throw new Error(
        'Please pass in valid getFn, setAuthFn and setUserFn parameters into the Hedgehog constructor'
      )
    }
    this.getFn = getFn
    this.setAuthFn = setAuthFn
    this.setUserFn = setUserFn
    this.wallet = null
    this.localStorage = localStorage
    this.createKey = createKey
    this.ready = false

    if (useLocalStorage) {
      this.restoreLocalWallet().then(() => {
        this.ready = true
      })
    } else {
      this.ready = true
    }
  }

  isReady() {
    return this.ready
  }

  async waitUntilReady() {
    await waitUntil(() => this.isReady())
  }

  async signUp({ username, password, ...optionalParams }: LoginArgs) {
    const createWalletPromise = WalletManager.createWalletObj(
      password,
      null,
      this.localStorage,
      this.createKey
    )
    const lookupKeyPromise = WalletManager.createAuthLookupKey(
      username,
      password,
      this.createKey
    )

    try {
      const [walletResult, lookupKey] = await Promise.all([
        createWalletPromise,
        lookupKeyPromise
      ])

      if (walletResult instanceof Error) throw walletResult
      const { ivHex, cipherTextHex, walletObj } = walletResult

      const walletAddress = walletObj.getAddressString()

      const authData = {
        ...optionalParams,
        iv: ivHex,
        cipherText: cipherTextHex,
        wallet: walletObj,
        lookupKey
      }

      const userData = {
        ...optionalParams,
        username,
        walletAddress
      }
      await this.setUserFn(userData)
      await this.setAuthFn(authData)

      this.wallet = walletObj

      return walletObj
    } catch (e) {
      await this.logout()
      throw e
    }
  }

  async resetPassword({ username, password, ...optionalParams }: LoginArgs) {
    const entropy = await WalletManager.getEntropyFromLocalStorage(
      this.localStorage
    )
    if (entropy === null) {
      throw new Error('resetPassword - missing entropy')
    }

    const createWalletPromise = WalletManager.createWalletObj(
      password,
      entropy,
      this.localStorage,
      this.createKey
    )
    const lookupKeyPromise = WalletManager.createAuthLookupKey(
      username,
      password,
      this.createKey
    )

    try {
      const [walletResult, lookupKey] = await Promise.all([
        createWalletPromise,
        lookupKeyPromise
      ])

      if (walletResult instanceof Error) throw walletResult
      const { ivHex, cipherTextHex, walletObj } = walletResult

      const authData = {
        ...optionalParams,
        iv: ivHex,
        cipherText: cipherTextHex,
        wallet: walletObj,
        lookupKey
      }

      await this.setAuthFn(authData)
      this.wallet = walletObj
    } catch (e) {
      await this.logout()
      throw e
    }
  }

  async changeCredentials({
    newUsername,
    newPassword,
    oldUsername,
    oldPassword,
    ...optionalParams
  }: ChangeCredentialsArgs) {
    const entropy = await WalletManager.getEntropyFromLocalStorage(
      this.localStorage
    )
    if (entropy === null) {
      throw new Error('changePassword - missing entropy')
    }

    const createWalletPromise = WalletManager.createWalletObj(
      newPassword,
      entropy,
      this.localStorage,
      this.createKey
    )
    const lookupKeyPromise = WalletManager.createAuthLookupKey(
      newUsername,
      newPassword,
      this.createKey
    )
    const oldLookupKeyPromise = WalletManager.createAuthLookupKey(
      oldUsername !== undefined ? oldUsername : newUsername,
      oldPassword,
      this.createKey
    )
    const [walletResult, lookupKey, oldLookupKey] = await Promise.all([
      createWalletPromise,
      lookupKeyPromise,
      oldLookupKeyPromise
    ])

    if (walletResult instanceof Error) throw walletResult

    const { ivHex, cipherTextHex, walletObj } = walletResult

    const authData = {
      ...optionalParams,
      iv: ivHex,
      cipherText: cipherTextHex,
      lookupKey,
      wallet: walletObj,
      oldLookupKey
    }

    await this.setAuthFn(authData)
    this.wallet = walletObj
  }

  async login({ username, password, ...optionalParams }: LoginArgs) {
    const lookupKey = await WalletManager.createAuthLookupKey(
      username,
      password,
      this.createKey
    )
    const data = await this.getFn({ ...optionalParams, lookupKey })

    if (data && data.iv && data.cipherText) {
      const { walletObj, entropy } =
        await WalletManager.decryptCipherTextAndRetrieveWallet(
          password,
          data.iv,
          data.cipherText,
          this.createKey
        )

      this.wallet = walletObj

      await WalletManager.setEntropyInLocalStorage(entropy, this.localStorage)
      return walletObj
    } else {
      throw new Error('No account record for user')
    }
  }

  async confirmCredentials({
    username,
    password,
    ...optionalParams
  }: LoginArgs) {
    const existingEntropy = await WalletManager.getEntropyFromLocalStorage(
      this.localStorage
    )
    if (!existingEntropy) return false

    const lookupKey = await WalletManager.createAuthLookupKey(
      username,
      password,
      this.createKey
    )
    const data = await this.getFn({ ...optionalParams, lookupKey })

    if (data && data.iv && data.cipherText) {
      const { walletObj, entropy } =
        await WalletManager.decryptCipherTextAndRetrieveWallet(
          password,
          data.iv,
          data.cipherText,
          this.createKey
        )

      return (
        entropy === existingEntropy &&
        this.wallet !== null &&
        this.wallet.getAddressString() === walletObj.getAddressString()
      )
    }
    return false
  }

  async logout() {
    this.wallet = null
    await WalletManager.deleteEntropyFromLocalStorage(this.localStorage)
  }

  isLoggedIn() {
    return !!this.wallet
  }

  getWallet() {
    return this.wallet
  }

  async restoreLocalWallet() {
    const walletObj = await WalletManager.getWalletObjFromLocalStorageIfExists(
      this.localStorage
    )
    if (walletObj) {
      this.wallet = walletObj
      return walletObj
    } else return null
  }

  async createWalletObj(password: string) {
    if (password) {
      const walletResult = await WalletManager.createWalletObj(
        password,
        null,
        this.localStorage,
        this.createKey
      )
      if (walletResult instanceof Error) throw walletResult
      const { walletObj, entropy } = walletResult
      this.wallet = walletObj

      await WalletManager.setEntropyInLocalStorage(entropy, this.localStorage)

      return walletObj
    } else {
      throw new Error('Please pass in a valid password')
    }
  }
}
