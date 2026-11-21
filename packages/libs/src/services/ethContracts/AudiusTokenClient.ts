import type BN from 'bn.js'
import type Web3 from 'web3'
import type { Contract } from 'web3-eth-contract'
import type { AbiItem } from 'web3-utils'

import type { EthWeb3Manager } from '../ethWeb3Manager'

export class AudiusTokenClient {
  ethWeb3Manager: EthWeb3Manager
  contractABI: AbiItem[]
  contractAddress: string
  web3: Web3
  AudiusTokenContract: Contract
  bustCacheNonce: number

  constructor(
    ethWeb3Manager: EthWeb3Manager,
    contractABI: AbiItem[],
    contractAddress: string
  ) {
    this.ethWeb3Manager = ethWeb3Manager
    this.contractABI = contractABI
    this.contractAddress = contractAddress

    this.web3 = this.ethWeb3Manager.getWeb3()
    this.AudiusTokenContract = new this.web3.eth.Contract(
      this.contractABI,
      this.contractAddress
    )

    this.bustCacheNonce = 0
  }

  async bustCache() {
    this.bustCacheNonce += 1
  }

  async balanceOf(account: string) {
    let args
    if (this.bustCacheNonce > 0) {
      args = { _audiusBustCache: this.bustCacheNonce }
    }
    const balance = await this.AudiusTokenContract.methods
      .balanceOf(account)
      .call(args)
    return this.web3.utils.toBN(balance)
  }

  async name() {
    const name = await this.AudiusTokenContract.methods.name().call()
    return name
  }

  async nonces(wallet: string) {
    const nonce = await this.AudiusTokenContract.methods.nonces(wallet).call({
      _audiusBustCache: Date.now()
    })
    const number = this.web3.utils.toBN(nonce).toNumber()
    return number
  }

  async transfer(recipient: string, amount: BN) {
    const contractMethod = this.AudiusTokenContract.methods.transfer(
      recipient,
      amount
    )
    const tx = await this.ethWeb3Manager.sendTransaction(contractMethod)
    return { txReceipt: tx }
  }

  async transferFrom(
    owner: string,
    recipient: string,
    relayer: string,
    amount: BN
  ) {
    const method = this.AudiusTokenContract.methods.transferFrom(
      owner,
      recipient,
      amount
    )
    const tx = await this.ethWeb3Manager.relayTransaction(
      method,
      this.contractAddress,
      owner,
      relayer,
      0
    )
    return { txReceipt: tx }
  }

  async permit(
    owner: string, // address
    spender: string, // address
    value: BN, // uint
    deadline: number, // uint
    v: number, // uint8
    r: Uint8Array | Buffer, // bytes32
    s: Uint8Array | Buffer
  ) {
    const contractMethod = this.AudiusTokenContract.methods.permit(
      owner,
      spender,
      value,
      deadline,
      v,
      r,
      s
    )
    const tx = await this.ethWeb3Manager.relayTransaction(
      contractMethod,
      this.contractAddress,
      owner,
      spender,
      0
    )
    return tx
  }

  async approve(spender: string, value: BN, privateKey = null) {
    const contractMethod = this.AudiusTokenContract.methods.approve(
      spender,
      value
    )
    let tx
    if (privateKey === null) {
      tx = await this.ethWeb3Manager.sendTransaction(contractMethod)
    } else {
      tx = await this.ethWeb3Manager.sendTransaction(
        contractMethod,
        this.contractAddress,
        privateKey
      )
    }
    return { txReceipt: tx }
  }

  async approveProxyTokens(
    owner: string,
    spender: string,
    value: BN,
    relayer: string
  ) {
    const method = this.AudiusTokenContract.methods.approve(spender, value)
    const tx = await this.ethWeb3Manager.relayTransaction(
      method,
      this.contractAddress,
      owner,
      relayer,
      0
    )
    return { txReceipt: tx }
  }
}
