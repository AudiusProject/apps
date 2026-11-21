import BN from 'bn.js'

import { Address, BlockNumber } from 'types'

import { AudiusClient } from '../AudiusClient'

export default class Staking {
  aud: AudiusClient

  constructor(aud: AudiusClient) {
    this.aud = aud
  }

  getContract() {
    return this.aud.libs.ethContracts.StakingProxyClient
  }

  async token(): Promise<Address> {
    await this.aud.hasPermissions()
    const info = await this.getContract().token()
    return info
  }

  async totalStaked(): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().totalStaked()
    return info
  }

  async supportsHistory(): Promise<boolean> {
    await this.aud.hasPermissions()
    const info = await this.getContract().supportsHistory()
    return info
  }

  async totalStakedFor(account: Address): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().totalStakedFor(account)
    return info
  }

  async totalStakedForAt(
    account: Address,
    blockNumber: BlockNumber
  ): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().totalStakedForAt(account, blockNumber)
    return info
  }

  async totalStakedAt(blockNumber: BlockNumber): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().totalStakedAt(blockNumber)
    return info
  }

  async isStaker(account: Address): Promise<boolean> {
    await this.aud.hasPermissions()
    const info = await this.getContract().isStaker(account)
    return info
  }
}
