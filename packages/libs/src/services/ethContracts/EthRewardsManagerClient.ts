import { ContractClient } from '../contracts/ContractClient'

export class EthRewardsManagerClient extends ContractClient {
  async token() {
    const method = await this.getMethod('token')
    const info = await method.call()
    return info
  }

  async getGovernanceAddress() {
    const method = await this.getMethod('getGovernanceAddress')
    const info = await method.call()
    return info
  }

  async getRecipientAddress() {
    const method = await this.getMethod('getRecipientAddress')
    const info = await method.call()
    return info
  }

  async getAntiAbuseOracleAddresses() {
    const method = await this.getMethod('getAntiAbuseOracleAddresses')
    const info = await method.call()
    return info
  }
}
