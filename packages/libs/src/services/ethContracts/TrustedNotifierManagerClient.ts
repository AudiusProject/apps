import { GovernedContractClient } from '../contracts/GovernedContractClient'

export class TrustedNotifierManagerClient extends GovernedContractClient {
  async registerNotifier(
    wallet: string,
    endpoint: string,
    email: string,
    privateKey: string | null = null
  ) {
    const method = await this.getGovernedMethod(
      'registerNotifier',
      wallet,
      endpoint,
      email
    )
    return await this.web3Manager.sendTransaction(
      method,
      await this.governanceClient.getAddress(),
      privateKey
    )
  }

  async deregisterNotifier(wallet: string, privateKey: string | null = null) {
    const method = await this.getGovernedMethod('deregisterNotifier', wallet)
    return await this.web3Manager.sendTransaction(
      method,
      await this.governanceClient.getAddress(),
      privateKey
    )
  }

  async getLatestNotifierID() {
    const method = await this.getMethod('getLatestNotifierID')
    const ID = await method.call()
    return parseInt(ID)
  }

  async getNotifierForID(ID: string) {
    const method = await this.getMethod('getNotifierForID', ID)
    const notifierInfo = await method.call()
    return {
      wallet: notifierInfo.wallet,
      endpoint: notifierInfo.endpoint.replace(/\/$/, ''),
      email: notifierInfo.email.replace(/\/$/, '')
    }
  }

  async getNotifierForWallet(wallet: string) {
    const method = await this.getMethod('getNotifierForWallet', wallet)
    const notifierInfo = await method.call()
    return {
      ID: notifierInfo.ID,
      endpoint: notifierInfo.endpoint.replace(/\/$/, ''),
      email: notifierInfo.email.replace(/\/$/, '')
    }
  }

  async getNotifierForEndpoint(endpoint: string) {
    const method = await this.getMethod('getNotifierForEndpoint', endpoint)
    const notifierInfo = await method.call()
    return {
      ID: notifierInfo.ID,
      wallet: notifierInfo.wallet,
      email: notifierInfo.email.replace(/\/$/, '')
    }
  }

  async getNotifierForEmail(email: string) {
    const method = await this.getMethod('getNotifierForEmail', email)
    const notifierInfo = await method.call()
    return {
      ID: notifierInfo.ID,
      wallet: notifierInfo.wallet,
      endpoint: notifierInfo.endpoint.replace(/\/$/, '')
    }
  }
}
