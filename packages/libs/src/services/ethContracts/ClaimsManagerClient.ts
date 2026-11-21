import { Utils } from '../../utils'
import { ContractClient } from '../contracts/ContractClient'

export class ClaimsManagerClient extends ContractClient {
  async getFundingRoundBlockDiff() {
    const method = await this.getMethod('getFundingRoundBlockDiff')
    const info = await method.call()
    return parseInt(info)
  }

  async getLastFundedBlock() {
    const method = await this.getMethod('getLastFundedBlock')
    const info = await method.call()
    return parseInt(info)
  }

  async getFundsPerRound() {
    const method = await this.getMethod('getFundsPerRound')
    const info = await method.call()
    return Utils.toBN(info)
  }

  async getTotalClaimedInRound() {
    const method = await this.getMethod('getTotalClaimedInRound')
    const info = await method.call()
    return Utils.toBN(info)
  }

  async getGovernanceAddress() {
    const method = await this.getMethod('getGovernanceAddress')
    const info = await method.call()
    return info
  }

  async getServiceProviderFactoryAddress() {
    const method = await this.getMethod('getServiceProviderFactoryAddress')
    const info = await method.call()
    return info
  }

  async getDelegateManagerAddress() {
    const method = await this.getMethod('getDelegateManagerAddress')
    const info = await method.call()
    return info
  }

  async getStakingAddress() {
    const method = await this.getMethod('getStakingAddress')
    const info = await method.call()
    return info
  }

  async claimPending(address: string) {
    const method = await this.getMethod('claimPending', address)
    const info = await method.call()
    return info
  }

  async initiateRound(txRetries = 5) {
    const method = await this.getMethod('initiateRound')
    return await this.web3Manager.sendTransaction(method, null, null, txRetries)
  }

  async getClaimProcessedEvents({
    claimer,
    queryStartBlock = 0
  }: {
    claimer: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents('ClaimProcessed', {
      fromBlock: queryStartBlock,
      filter: {
        _claimer: claimer
      }
    })
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      claimer: event.returnValues._claimer,
      rewards: Utils.toBN(event.returnValues._rewards),
      oldTotal: Utils.toBN(event.returnValues._oldTotal),
      newTotal: Utils.toBN(event.returnValues._newTotal)
    }))
  }
}
