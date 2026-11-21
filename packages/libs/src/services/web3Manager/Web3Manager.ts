import type { Hedgehog } from '@audius/hedgehog'
import type { DecodedLog } from 'abi-decoder'
import retry from 'async-retry'
import sigUtil from 'eth-sig-util'
import type { EIP712TypedData } from 'eth-sig-util'
import EthereumWallet from 'ethereumjs-wallet'
import type Web3Type from 'web3'
import type { HttpProvider, TransactionReceipt, EventLog } from 'web3-core'

import type { AudiusLibs } from '../../AudiusLibs'
import Web3 from '../../LibsWeb3'
import {
  ContractMethod,
  estimateGas,
  MultiProvider,
  Nullable
} from '../../utils'
import { AudiusABIDecoder } from '../ABIDecoder'
import type { DiscoveryProvider } from '../discoveryProvider'
import type { IdentityService } from '../identity'

import type { Web3Config } from './Web3Config'
import { getXMLHttpRequest, XMLHttpRequest } from './XMLHttpRequest'

const DEFAULT_GAS_LIMIT = 2000000

export type Web3ManagerConfig = {
  web3Config: Web3Config
  identityService: Nullable<IdentityService>
  hedgehog: Nullable<Hedgehog>
  isServer?: boolean
}

export class Web3Manager {
  web3Config: Web3Config
  isServer: boolean
  identityService: Nullable<IdentityService>
  hedgehog: Nullable<Hedgehog>
  AudiusABIDecoder: typeof AudiusABIDecoder
  web3: Web3Type | undefined
  useExternalWeb3: boolean | undefined
  ownerWallet?: EthereumWallet
  userSuppliedHandle?: string
  discoveryProvider: Nullable<DiscoveryProvider>
  XMLHttpRequest: Nullable<XMLHttpRequest>

  constructor({
    web3Config,
    identityService,
    hedgehog,
    isServer = false
  }: Web3ManagerConfig) {
    this.web3Config = web3Config
    this.isServer = isServer

    this.identityService = identityService
    this.discoveryProvider = null
    this.hedgehog = hedgehog
    this.AudiusABIDecoder = AudiusABIDecoder
    this.XMLHttpRequest = null
  }

  async init() {
    const web3Config = this.web3Config
    if (!web3Config) throw new Error('Failed to initialize Web3Manager')

    this.XMLHttpRequest = await getXMLHttpRequest()

    if (
      web3Config?.useExternalWeb3 &&
      web3Config.externalWeb3Config?.web3 &&
      web3Config.externalWeb3Config.ownerWallet
    ) {
      this.web3 = web3Config.externalWeb3Config.web3
      this.useExternalWeb3 = true
      this.ownerWallet = web3Config.externalWeb3Config.ownerWallet
    } else if (
      web3Config &&
      !web3Config.useExternalWeb3 &&
      web3Config.internalWeb3Config?.web3ProviderEndpoints
    ) {
      this.setInternalWeb3Endpoint()

      if (web3Config.internalWeb3Config.privateKey) {
        const pkeyBuffer = Buffer.from(
          web3Config.internalWeb3Config.privateKey,
          'hex'
        )
        this.ownerWallet = EthereumWallet.fromPrivateKey(pkeyBuffer)
        return
      }

      const storedWallet = this.hedgehog?.getWallet()
      if (storedWallet) {
        this.ownerWallet = storedWallet
      } else {
        const passwordEntropy = `audius-dummy-pkey-${Math.floor(
          Math.random() * 1000000
        )}`
        this.ownerWallet = await this.hedgehog?.createWalletObj(passwordEntropy)
      }
    } else {
      throw new Error("web3ProviderEndpoint isn't passed into constructor")
    }
  }

  getWeb3() {
    return this.web3 as Web3Type
  }

  setWeb3(web3: Web3Type) {
    this.web3 = web3
  }

  usingInternalWeb3(): boolean {
    return (
      this.web3Config &&
      !this.web3Config.useExternalWeb3 &&
      this.web3Config.internalWeb3Config?.web3ProviderEndpoints.length > 0
    )
  }

  setDiscoveryProvider(discoveryProvider: DiscoveryProvider) {
    this.discoveryProvider = discoveryProvider
    if (this.usingInternalWeb3()) {
      this.setInternalWeb3Endpoint()
    }
  }

  setInternalWeb3Endpoint() {
    const gatewayweb3endpoint =
      this.web3Config.internalWeb3Config.web3ProviderEndpoints[0]!
    const discoveryweb3endpoint = `${this.discoveryProvider?.discoveryProviderEndpoint}/chain`
    const web3endpoint =
      this.discoveryProvider !== null
        ? discoveryweb3endpoint
        : gatewayweb3endpoint
    this.web3 = new Web3(this.provider(web3endpoint, 10000))
    this.useExternalWeb3 = false
  }

  useDiscoveryRelay() {
    return !(this.discoveryProvider === null)
  }

  getWalletAddress() {
    if (this.useExternalWeb3) {
      // @ts-expect-error Wallet type doesn't have `toLowerCase` method?
      return this.ownerWallet.toLowerCase()
    } else {
      return this.ownerWallet?.getAddressString()
    }
  }

  setOwnerWallet(ownerWallet: EthereumWallet) {
    this.ownerWallet = ownerWallet
  }

  web3IsExternal() {
    return this.useExternalWeb3
  }

  setUserSuppliedHandle(handle: string) {
    this.userSuppliedHandle = handle
  }

  getOwnerWalletPrivateKey() {
    if (this.useExternalWeb3) {
      throw new Error("Can't get owner wallet private key for external web3")
    } else {
      return this.ownerWallet?.getPrivateKey()
    }
  }

  async sign(data: string | Buffer) {
    if (this.useExternalWeb3) {
      const account = this.getWalletAddress()
      if (this.isServer) {
        return await this.web3?.eth.sign(
          this.web3.utils.fromUtf8(data as string),
          account
        )
      } else {
        return await this.web3?.eth.personal.sign(
          this.web3.utils.fromUtf8(data as string),
          account,
          ''
        )
      }
    }

    return sigUtil.personalSign(this.getOwnerWalletPrivateKey()!, { data })
  }

  async verifySignature(data: string, signature: string) {
    return sigUtil.recoverPersonalSignature({ data, sig: signature })
  }

  async signTypedData(signatureData: EIP712TypedData) {
    if (this.useExternalWeb3) {
      return await ethSignTypedData(
        this.getWeb3(),
        this.getWalletAddress(),
        signatureData
      )
    } else {
      Object.keys(signatureData.message).forEach((key) => {
        const message = signatureData.message[key]
        if (typeof message === 'string' && !message.startsWith('0x')) {
          signatureData.message[key] = Buffer.from(message)
        }
      })
      return sigUtil.signTypedData(this.ownerWallet!.getPrivateKey(), {
        data: signatureData
      })
    }
  }

  async sendTransaction(
    contractMethod: ContractMethod,
    contractRegistryKey?: string | null,
    contractAddress?: string | null,
    txRetries = 5,
    txGasLimit?: number,
    nethermindContractAddress?: string | null,
    nethermindContractMethod?: ContractMethod
  ): Promise<TransactionReceipt> {
    const gasLimit =
      txGasLimit ??
      (await estimateGas({
        method: contractMethod,
        gasLimitMaximum: DEFAULT_GAS_LIMIT
      }))
    if (this.useExternalWeb3) {
      return await contractMethod.send({
        from: this.ownerWallet,
        gas: gasLimit
      })
    } else {
      const encodedABI = contractMethod.encodeABI()
      const nethermindEncodedAbi = nethermindContractMethod?.encodeABI()

      if (this.useDiscoveryRelay()) {
        contractRegistryKey = contractRegistryKey || 'EntityManager'
        const response = await this.discoveryProvider?.relay({
          contractRegistryKey,
          contractAddress,
          senderAddress: this.ownerWallet!.getAddressString(),
          encodedABI,
          gasLimit,
          handle: this.userSuppliedHandle,
          nethermindContractAddress,
          nethermindEncodedAbi
        })
        return this.parseLogs(response, contractRegistryKey)
      } else {
        const response = await retry(
          async (bail) => {
            try {
              return await this.identityService?.relay(
                contractRegistryKey,
                contractAddress,
                this.ownerWallet!.getAddressString(),
                encodedABI,
                gasLimit,
                this.userSuppliedHandle,
                nethermindContractAddress,
                nethermindEncodedAbi
              )
            } catch (e: any) {
              if (e.response.status === 403) {
                bail(e)
                return
              }

              throw e
            }
          },
          {
            minTimeout: 500,
            maxTimeout: 4000,
            factor: 3,
            retries: txRetries,
            onRetry: (err) => {
              if (err) {
                console.info(
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  `libs web3Manager transaction send retry error : ${err}`
                )
              }
            }
          }
        )
        return this.parseLogs(response, contractRegistryKey as string)
      }
    }
  }

  parseLogs(
    response: { receipt: TransactionReceipt } | undefined,
    contractRegistryKey: string
  ): TransactionReceipt {
    const receipt = response!.receipt
    if (receipt.logs) {
      const events: TransactionReceipt['events'] = {}
      const decoded = this.AudiusABIDecoder.decodeLogs(
        contractRegistryKey as string,
        receipt.logs
      ) as unknown as DecodedLog[]
      decoded.forEach((evt) => {
        const returnValues: Record<string, string> = {}
        evt.events.forEach((arg: { name: string; value: string }) => {
          returnValues[arg.name] = arg.value
        })
        const eventLog = { returnValues }
        events[evt.name] = eventLog as EventLog
      })
      receipt.events = events
    }
    return response!.receipt
  }

  provider(url: string, timeout: number) {
    return this.monkeyPatchProvider(
      new Web3.providers.HttpProvider(url, { timeout })
    )
  }

  monkeyPatchProvider(httpProvider: HttpProvider) {
    // @ts-expect-error overriding a private method not appearing in types
    override(httpProvider, '_prepareRequest', function () {
      return function (
        this: HttpProvider & {
          timeout: number
          headers: Array<{ name: string; value: string }>
        }
      ) {
        const request = new XMLHttpRequest()

        request.open('POST', this.host, true)
        request.setRequestHeader('Content-Type', 'application/json')
        request.timeout = this.timeout && this.timeout !== 1 ? this.timeout : 0

        if (this.headers) {
          this.headers.forEach(function (header) {
            request.setRequestHeader(header.name, header.value)
          })
        }
        return request
      }
    })
    return httpProvider
  }
  // End vendored code
}

declare global {
  interface Window {
    audiusLibs: AudiusLibs
  }
}

const ethSignTypedData = async (
  web3: Web3Type,
  wallet: EthereumWallet,
  signatureData: EIP712TypedData
) => {
  return await new Promise((resolve, reject) => {
    let processedSignatureData: EIP712TypedData | string = signatureData
    let method
    const provider = window.audiusLibs.web3Manager?.getWeb3()
      .currentProvider as MultiProvider
    if (
      // @ts-expect-error isMetaMask is not defined on HTTPProvider, but MetaMask's flavor has it.
      provider?.providers?.[0]?.isMetaMask === true
    ) {
      method = 'eth_signTypedData_v3'
      processedSignatureData = JSON.stringify(signatureData)
    } else {
      method = 'eth_signTypedData'
      // fix per https://github.com/ethereum/web3.js/issues/1119
    }

    ;(web3.currentProvider as HttpProvider).send(
      {
        method,
        params: [wallet, processedSignatureData],
        // @ts-expect-error from not in JsonRpcPayload
        from: wallet
      },
      (err, result) => {
        if (err) {
          reject(err)
        } else if (result?.error) {
          reject(result?.error)
        } else {
          resolve(result?.result)
        }
      }
    )
  })
}

function override<Class, K extends keyof Class, T extends Class[K] & Function>(
  object: Class,
  methodName: K,
  callback: T
) {
  object[methodName] = callback(object[methodName])
}
