import type { EthWallet } from './types'
import { bufferFromHexString, bytesToHexString } from './utils'

export class HedgehogWallet implements EthWallet {
  private readonly privateKey: Uint8Array
  private readonly publicKeyHex: string
  private readonly checksumAddress: string

  constructor(
    privateKey: Uint8Array,
    publicKey: string,
    checksumAddress: string
  ) {
    this.privateKey = Uint8Array.from(privateKey)
    this.publicKeyHex = publicKey.toLowerCase().replace(/^0x04/, '')
    this.checksumAddress = checksumAddress
  }

  getPrivateKey() {
    return Uint8Array.from(this.privateKey)
  }

  getPrivateKeyString() {
    return '0x' + bytesToHexString(this.privateKey)
  }

  getPublicKey() {
    return bufferFromHexString(this.publicKeyHex)
  }

  getPublicKeyString() {
    return '0x' + this.publicKeyHex
  }

  getAddress() {
    return bufferFromHexString(this.checksumAddress.slice(2).toLowerCase())
  }

  getAddressString() {
    return this.checksumAddress.toLowerCase()
  }

  getChecksumAddressString() {
    return this.checksumAddress
  }
}
