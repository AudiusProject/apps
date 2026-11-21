export type LocalStorage = {
  getItem: (key: string) => Promise<string | null> | string | null
  setItem: (key: string, value: string) => Promise<void> | void
  removeItem: (key: string) => Promise<void> | void
}

export type PrivateKey = { keyHex: string; keyBuffer: Uint8Array }

export type CreateKey = (
  encryptStr: string,
  ivHex: string
) => Promise<PrivateKey>

export type EthWallet = {
  getPrivateKey: () => Uint8Array
  getPrivateKeyString: () => string
  getPublicKey: () => Uint8Array
  getPublicKeyString: () => string
  getAddress: () => Uint8Array
  getAddressString: () => string
  getChecksumAddressString: () => string
}

export type GetFn = (params: {
  lookupKey: string
  [key: string]: unknown
}) =>
  | Promise<{ iv: string; cipherText: string }>
  | { iv: string; cipherText: string }

export type SetAuthFn = (params: {
  iv: string
  cipherText: string
  lookupKey: string
  wallet: EthWallet
  oldLookupKey?: string
  [key: string]: unknown
}) => any | Promise<any>

export type SetUserFn = (params: {
  walletAddress: string
  username: string
  [key: string]: unknown
}) => any | Promise<any>

export type LoginArgs = {
  username: string
  password: string
  [key: string]: unknown
}

export type ChangeCredentialsArgs = {
  newUsername: string
  newPassword: string
  oldUsername: string
  oldPassword: string
  [key: string]: unknown
}
