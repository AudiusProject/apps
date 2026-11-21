import axios, { AxiosResponse } from 'axios'
import bs58 from 'bs58'
import Hashids from 'hashids'
import type { AbiItem } from 'web3-utils'

import Web3 from '../LibsWeb3'

import { fileHasher } from './fileHasher'
import type { ImageHasher, NonImageHasher, HashedImage } from './fileHasher'
import { MultiProvider } from './multiProvider'
import { uuid } from './uuid'

const HASH_SALT = 'azowernasdfoia'
const MIN_LENGTH = 5
const hashids = new Hashids(HASH_SALT, MIN_LENGTH)

const ZeroAddress = '0x0000000000000000000000000000000000000000'

export type { ImageHasher, NonImageHasher, HashedImage }

export type ContractABI = {
  abi: AbiItem[]
  contractName: string
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- this should just be esm
export class Utils {
  static utf8ToHex(utf8Str: string) {
    return Web3.utils.utf8ToHex(utf8Str)
  }

  static padRight(hexStr: string, size: number) {
    return Web3.utils.padRight(hexStr, size)
  }

  static hexToUtf8(hexStr: string) {
    return Web3.utils.hexToUtf8(hexStr)
  }

  static keccak256(utf8Str: string) {
    return Web3.utils.keccak256(utf8Str)
  }

  static isBN(number: number | string) {
    return Web3.utils.isBN(number)
  }

  static toBN(number: number | string, base?: number) {
    return new Web3.utils.BN(number, base)
  }

  static BN() {
    return Web3.utils.BN
  }

  static checkStrLen(str: string, maxLen: number, minLen = 1) {
    if (
      str === undefined ||
      str === null ||
      str.length > maxLen ||
      str.length < minLen
    ) {
      throw new Error(
        `String '${str}' must be between ${minLen}-${maxLen} characters`
      )
    }
  }

  static async wait(milliseconds: number) {
    return await new Promise<void>((resolve) =>
      setTimeout(resolve, milliseconds)
    )
  }

  static isFQDN(url: string) {
    const FQDN =
      /(?:^|[ \t])((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/gm
    return FQDN.test(url)
  }

  static isHttps(url: string) {
    const https = /^https:\/\//
    return https.test(url)
  }

  static async isHealthy(url: string) {
    try {
      const { data: body }: AxiosResponse<{ data: { healthy: boolean } }> =
        await axios.get(url + '/health_check')
      return body.data.healthy
    } catch (error) {
      return false
    }
  }

  static formatOptionalMultihash(multihash: string) {
    if (multihash) {
      return this.decodeMultihash(multihash).digest
    } else {
      return this.utf8ToHex('')
    }
  }

  static decodeMultihash(multihash: string) {
    const base16Multihash = bs58.decode(multihash)
    return {
      digest: `0x${base16Multihash.slice(2).toString('hex')}`,
      hashFn: parseInt(base16Multihash[0] as unknown as string),
      size: parseInt(base16Multihash[1] as unknown as string)
    }
  }

  static encodeMultihash(multihashDigest: string) {
    const digestStr = `1220${multihashDigest.replace('0x', '')}`
    return bs58.encode(Buffer.from(digestStr, 'hex'))
  }

  static parseDataFromResponse(response: AxiosResponse) {
    if (!response || !response.data) return null

    const obj = response.data

    if (obj == null) return null
    if ((Array.isArray(obj) || typeof obj === 'string') && obj.length === 0)
      return null
    if (Object.keys(obj).length === 0) return null

    return obj
  }

  static async configureWeb3(
    web3Provider: string,
    chainNetworkId: string,
    requiresAccount = true
  ) {
    const web3Instance = new Web3(new MultiProvider(web3Provider))

    try {
      const networkId = await web3Instance.eth.net.getId()
      if (chainNetworkId && networkId.toString() !== chainNetworkId) {
        return false
      }
      if (requiresAccount) {
        const accounts = await web3Instance.eth.getAccounts()
        if (!accounts || accounts.length < 1) {
          return false
        }
      }
    } catch (e) {
      return false
    }

    return web3Instance
  }

  static get zeroAddress() {
    return ZeroAddress
  }

  static isZeroAddress(address: string) {
    return address === Utils.zeroAddress
  }

  static makeUuid() {
    return uuid()
  }

  static decodeHashId(id: string) {
    try {
      const ids = hashids.decode(id)
      if (!ids.length) return null
      const num = Number(ids[0])
      if (isNaN(num)) return null
      return num
    } catch (e) {
      console.error(`Failed to decode ${id}`, e)
      return null
    }
  }

  static encodeHashId(id: number | null) {
    try {
      if (id === null) return null
      const encodedId = hashids.encode(id)
      return encodedId
    } catch (e) {
      console.error(`Failed to encode ${id}`, e)
      return null
    }
  }

  static async racePromiseWithTimeout(
    promise: Promise<void>,
    timeoutMs: number,
    timeoutMessage: string
  ) {
    // eslint-disable-next-line promise/param-names
    const timeoutPromise = new Promise((_promise, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    })
    return await Promise.race([promise, timeoutPromise])
  }

  static getRandomInt(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min) + min)
  }

  static fileHasher = fileHasher
}
