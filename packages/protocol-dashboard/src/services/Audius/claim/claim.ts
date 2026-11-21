import BN from 'bn.js'

import { ClaimProcessedEvent } from 'models/TimelineEvents'
import { BlockNumber, Address } from 'types'

import { AudiusClient } from '../AudiusClient'

import { GetClaimProcessedResponse } from './types'

export interface TransactionReceipt {
  status: boolean
  transactionHash: string
  transactionIndex: number
  blockHash: string
  blockNumber: number
  from: string
  to: string
  contractAddress?: string
  cumulativeGasUsed: number
  gasUsed: number
  effectiveGasPrice: number
  logs: any[]
  logsBloom: string
  events?: {
    [eventName: string]: any
  }
}

export default class Claim {
  aud: AudiusClient

  constructor(aud: AudiusClient) {
    this.aud = aud
  }

  getContract() {
    return this.aud.libs.ethContracts.ClaimsManagerClient
  }

  async getFundingRoundBlockDiff(): Promise<BlockNumber> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getFundingRoundBlockDiff()
    return info
  }

  async getLastFundedBlock(): Promise<BlockNumber> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getLastFundedBlock()
    return info
  }

  async getFundsPerRound(): Promise<BN> {
    await this.aud.hasPermissions()
    const claimAmount = await this.getContract().getFundsPerRound()
    return new BN(claimAmount)
  }

  async getTotalClaimedInRound(): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getTotalClaimedInRound()
    return info
  }

  async getGovernanceAddress(): Promise<Address> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getGovernanceAddress()
    return info
  }

  async getServiceProviderFactoryAddress(): Promise<Address> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getServiceProviderFactoryAddress()
    return info
  }

  async getDelegateManagerAddress(): Promise<Address> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getDelegateManagerAddress()
    return info
  }

  async getStakingAddress(): Promise<Address> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getStakingAddress()
    return info
  }

  async claimPending(address: Address): Promise<boolean> {
    await this.aud.hasPermissions()
    const info = await this.getContract().claimPending(address)
    return info
  }

  async initiateRound(): Promise<TransactionReceipt> {
    await this.aud.hasPermissions()
    await this.getContract().init()
    const info = await this.getContract().initiateRound()
    return info
  }

  async getCurrentRound() {
    await this.aud.hasPermissions()
    await this.getContract().init()
    const contractAddress = this.getContract()._contractAddress
    const latestFundedBlockNumber = await this.getLastFundedBlock()
    const logs = await this.aud.libs.ethWeb3Manager.getWeb3().eth.getPastLogs({
      address: contractAddress,
      fromBlock: latestFundedBlockNumber,
      toBlock: latestFundedBlockNumber
    })
    const roundNumber = logs?.[1].topics?.[2]
    return roundNumber ? parseInt(roundNumber, 16) : null
  }

  async getClaimProcessedEvents(
    claimer: Address
  ): Promise<ClaimProcessedEvent[]> {
    await this.aud.hasPermissions()
    const info: GetClaimProcessedResponse[] =
      await this.getContract().getClaimProcessedEvents({
        claimer
      })
    return info.map((e) => ({
      ...e,
      _type: 'ClaimProcessed'
    }))
  }
}
