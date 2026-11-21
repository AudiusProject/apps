import type { Hedgehog } from '@audius/hedgehog'
import bs58 from 'bs58'
import { BN, toBuffer } from 'ethereumjs-util'

import { Utils, sign, getTransferTokensDigest, Nullable } from '../../utils'
import type { EthContracts } from '../ethContracts'
import type { EthWeb3Manager } from '../ethWeb3Manager'
import type { IdentityService } from '../identity'
import type { SolanaWeb3Manager } from '../solana'

export type ProxyWormholeConfig = {}

export class ProxyWormhole {
  hedgehog: Nullable<Hedgehog>
  ethWeb3Manager: EthWeb3Manager
  ethContracts: EthContracts
  identityService: Nullable<IdentityService>
  solanaWeb3Manager: SolanaWeb3Manager

  constructor(
    hedgehog: Hedgehog | null,
    ethWeb3Manager: EthWeb3Manager,
    ethContracts: EthContracts,
    identityService: IdentityService | null,
    solanaWeb3Manager: SolanaWeb3Manager
  ) {
    this.hedgehog = hedgehog
    this.ethWeb3Manager = ethWeb3Manager
    this.ethContracts = ethContracts
    this.identityService = identityService
    this.solanaWeb3Manager = solanaWeb3Manager
  }

  async _getTransferTokensToEthWormholeParams(
    fromAccount: string,
    amount: BN,
    solanaAccount: string
  ) {
    if (!this.hedgehog) {
      throw new Error(
        'Hedgehog required for _getTransferTokensToEthWormholeParams'
      )
    }
    const web3 = this.ethWeb3Manager.getWeb3()
    const wormholeClientAddress =
      this.ethContracts.WormholeClient.contractAddress

    const chainId = await web3.eth.getChainId()

    const currentBlockNumber = await web3.eth.getBlockNumber()
    const currentBlock = await web3.eth.getBlock(currentBlockNumber)

    const deadline = (currentBlock.timestamp as unknown as number) + 60 * 60 * 1
    const solanaB58 = bs58.decode(solanaAccount).toString('hex')
    const recipient = toBuffer(`0x${solanaB58}`)
    const nonce = await this.ethContracts.WormholeClient.nonces(fromAccount)
    const arbiterFee = Utils.toBN('0')

    const digest = getTransferTokensDigest(
      web3,
      'AudiusWormholeClient',
      wormholeClientAddress,
      chainId,
      {
        from: fromAccount,
        amount,
        recipientChain: chainId,
        recipient,
        arbiterFee
      },
      nonce,
      deadline
    )
    const privateKey = this.hedgehog.getWallet()?.getPrivateKey()
    const signedDigest = sign(digest, privateKey!)
    return {
      chainId,
      deadline,
      recipient,
      arbiterFee,
      signedDigest
    }
  }

  async getTransferTokensToEthWormholeMethod(
    fromAccount: string,
    amount: BN,
    solanaAccount: string
  ) {
    const { chainId, deadline, recipient, arbiterFee, signedDigest } =
      await this._getTransferTokensToEthWormholeParams(
        fromAccount,
        amount,
        solanaAccount
      )
    const method =
      await this.ethContracts.WormholeClient.WormholeContract.methods.transferTokens(
        fromAccount,
        amount,
        chainId,
        recipient,
        arbiterFee,
        deadline,
        signedDigest.v,
        signedDigest.r,
        signedDigest.s
      )
    return method
  }
}
