import type { Hedgehog } from '@audius/hedgehog'
import retry from 'async-retry'
import type { AxiosError } from 'axios'
import { Transaction as EthereumTx } from 'ethereumjs-tx'
import type Wallet from 'ethereumjs-wallet'
import type Web3Type from 'web3'
import type { TransactionReceipt } from 'web3-core'

import Web3 from '../../LibsWeb3'
import {
  MultiProvider,
  estimateGas,
  ContractMethod,
  Maybe,
  Nullable
} from '../../utils'
import type { IdentityService, RelayTransaction } from '../identity'

const MIN_GAS_PRICE = Math.pow(10, 9)
const HIGH_GAS_PRICE = 250 * MIN_GAS_PRICE
const DEFAULT_GAS_PRICE = 100 * MIN_GAS_PRICE
const MAX_GAS_LIMIT = 5000000

export type EthWeb3Config = {
  ownerWallet: Wallet | string
  providers: string[]
  tokenAddress: string
  registryAddress: string
  claimDistributionContractAddress: string
  wormholeContractAddress: string
  disableMultiProvider?: boolean
}

type EthWeb3ManagerConfig = {
  web3Config: EthWeb3Config
  identityService: Nullable<IdentityService>
  hedgehog?: Nullable<Hedgehog>
}

export class EthWeb3Manager {
  web3Config: EthWeb3Config
  web3: Web3Type
  identityService: Nullable<IdentityService>
  hedgehog?: Nullable<Hedgehog>
  ownerWallet: Maybe<Wallet | string>

  constructor({ web3Config, identityService, hedgehog }: EthWeb3ManagerConfig) {
    if (!web3Config) throw new Error('web3Config object not passed in')
    if (!web3Config.providers)
      throw new Error('missing web3Config property: providers')

    let provider: MultiProvider | string
    if (!web3Config.disableMultiProvider) {
      provider = new MultiProvider(web3Config.providers)
    } else {
      provider = web3Config.providers![0]!
    }
    this.web3Config = web3Config
    this.web3 = new Web3(provider)
    this.identityService = identityService
    this.hedgehog = hedgehog

    if (this.web3Config.ownerWallet) {
      this.ownerWallet = this.web3Config.ownerWallet
    } else if (this.hedgehog) {
      const storedWallet = this.hedgehog.getWallet()
      if (storedWallet) {
        this.ownerWallet = storedWallet
      }
    }
  }

  getWeb3() {
    return this.web3
  }

  getWalletAddress() {
    if (this.ownerWallet) {
      // @ts-expect-error TODO extend ethereum-js-wallet to include toLowerCase
      return this.ownerWallet.toLowerCase()
    }
    throw new Error('Owner wallet not set')
  }

  async sign(data: string) {
    // @ts-expect-error TODO: sign expected to take a password as 3rd argument
    return await this.web3.eth.personal.sign(
      this.web3.utils.fromUtf8(data),
      this.getWalletAddress()
    )
  }

  async sendTransaction(
    contractMethod: ContractMethod,
    contractAddress: string | null = null,
    privateKey: string | null = null,
    txRetries = 5,
    txGasLimit: number | null = null
  ): Promise<TransactionReceipt> {
    const internalWallet = contractAddress && privateKey
    const gasLimit =
      txGasLimit ??
      (await estimateGas({
        method: contractMethod,
        from: this.ownerWallet,
        gasLimitMaximum: MAX_GAS_LIMIT,
        shouldThrowIfGasEstimationFails: !internalWallet
      }))
    if (internalWallet) {
      let gasPrice = parseInt(await this.web3.eth.getGasPrice())
      if (isNaN(gasPrice) || gasPrice > HIGH_GAS_PRICE) {
        gasPrice = DEFAULT_GAS_PRICE
      } else if (gasPrice === 0) {
        gasPrice = MIN_GAS_PRICE
      }
      const gasPriceStr = '0x' + gasPrice.toString(16)

      const privateKeyBuffer = Buffer.from(privateKey, 'hex')
      const walletAddress = this.getWalletAddress()
      const txCount = await this.web3.eth.getTransactionCount(walletAddress)
      const encodedABI = contractMethod.encodeABI()
      const txParams = {
        nonce: this.web3.utils.toHex(txCount),
        gasPrice: gasPriceStr,
        gasLimit,
        data: encodedABI,
        to: contractAddress,
        value: '0x00'
      }
      const tx = new EthereumTx(txParams)
      tx.sign(privateKeyBuffer)
      const signedTx = '0x' + tx.serialize().toString('hex')

      const response = await retry(
        async () => {
          return await this.web3.eth.sendSignedTransaction(signedTx)
        },
        {
          minTimeout: 500,
          maxTimeout: 4000,
          factor: 3,
          retries: txRetries,
          onRetry: (err) => {
            if (err) {
              console.info(
                // eslint-disable-next-line @typescript-eslint/no-base-to-string -- TODO
                `libs ethWeb3Manager transaction send retry error : ${err}`
              )
            }
          }
        }
      )

      return response
    }

    const block = await this.web3.eth.getBlock('latest')
    const baseFee = Number(block.baseFeePerGas)

    const feeHistory = await this.web3.eth.getFeeHistory(5, 'latest', [50])

    const priorityFee = Number(feeHistory?.reward?.[0]?.[0] ?? MIN_GAS_PRICE)
    const gasPrice = baseFee + priorityFee

    return await contractMethod.send({
      from: this.ownerWallet,
      gasPrice
    })
  }

  async relayTransaction(
    contractMethod: ContractMethod,
    contractAddress: string,
    ownerWallet: Wallet | string,
    relayerWallet?: Wallet | string,
    txRetries = 5,
    txGasLimit: number | null = null
  ): Promise<Maybe<RelayTransaction['resp']>> {
    const encodedABI = contractMethod.encodeABI()
    const gasLimit =
      txGasLimit ??
      (await estimateGas({
        from: relayerWallet,
        method: contractMethod,
        gasLimitMaximum: MAX_GAS_LIMIT
      }))

    const response = await retry<Maybe<RelayTransaction>>(
      async (bail) => {
        try {
          if (!this.identityService) {
            return
          }
          const attempt = await this.identityService.ethRelay(
            contractAddress,
            ownerWallet,
            encodedABI,
            gasLimit.toString()
          )
          return attempt
        } catch (e) {
          const error = e as AxiosError
          if (error.response?.status === 429) {
            bail(new Error('Please wait before trying again'))
            return
          }
          throw error
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
              // eslint-disable-next-line @typescript-eslint/no-base-to-string -- TODO
              `libs ethWeb3Manager transaction relay retry error : ${err}`
            )
          }
        }
      }
    )
    return response?.resp
  }

  async getRelayMethodParams(
    contractAddress: string,
    contractMethod: ContractMethod,
    relayerWallet: string
  ) {
    const encodedABI = contractMethod.encodeABI()
    const gasLimit = await estimateGas({
      from: relayerWallet,
      method: contractMethod,
      gasLimitMaximum: HIGH_GAS_PRICE
    })
    return {
      contractAddress,
      encodedABI,
      gasLimit
    }
  }
}
