export { Hedgehog } from './Hedgehog'
export { WalletManager } from './WalletManager'
export { Authentication, entropyToMnemonic } from './Authentication'
export { HedgehogWallet } from './HedgehogWallet'
export {
  bufferFromHexString,
  getPlatformCreateKey,
  getPlatformLocalStorage,
  waitUntil
} from './utils'
export type {
  ChangeCredentialsArgs,
  CreateKey,
  EthWallet,
  GetFn,
  LocalStorage,
  LoginArgs,
  PrivateKey,
  SetAuthFn,
  SetUserFn
} from './types'
