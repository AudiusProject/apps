import { Utils } from '../../utils'
import { GovernedContractClient } from '../contracts/GovernedContractClient'

export class ServiceTypeManagerClient extends GovernedContractClient {
  async setServiceVersion(
    serviceType: string,
    serviceVersion: string,
    privateKey: string | null = null,
    dryRun = false
  ) {
    const method = await this.getGovernedMethod(
      'setServiceVersion',
      Utils.utf8ToHex(serviceType),
      Utils.utf8ToHex(serviceVersion)
    )

    if (dryRun) {
      return `${Utils.utf8ToHex(serviceType)},${Utils.utf8ToHex(
        serviceVersion
      )}`
    }

    return await this.web3Manager.sendTransaction(
      method,
      await this.governanceClient.getAddress(),
      privateKey
    )
  }

  async addServiceType(
    serviceType: string,
    serviceTypeMin: string,
    serviceTypeMax: string,
    privateKey: string | null = null
  ) {
    const method = await this.getGovernedMethod(
      'addServiceType',
      Utils.utf8ToHex(serviceType),
      serviceTypeMin,
      serviceTypeMax
    )

    return await this.web3Manager.sendTransaction(
      method,
      await this.governanceClient.getAddress(),
      privateKey
    )
  }

  async getValidServiceTypes() {
    const method = await this.getMethod('getValidServiceTypes')
    const types: string[] = await method.call()
    return types.map((t) => Utils.hexToUtf8(t))
  }

  async getCurrentVersion(serviceType: string) {
    const method = await this.getMethod(
      'getCurrentVersion',
      Utils.utf8ToHex(serviceType)
    )
    const hexVersion = await method.call()
    return Utils.hexToUtf8(hexVersion)
  }

  async getVersion(serviceType: string, serviceTypeIndex: number) {
    const serviceTypeBytes32 = Utils.utf8ToHex(serviceType)
    const method = await this.getMethod(
      'getVersion',
      serviceTypeBytes32,
      serviceTypeIndex
    )
    const version = await method.call()
    return Utils.hexToUtf8(version)
  }

  async getNumberOfVersions(serviceType: string) {
    const method = await this.getMethod(
      'getNumberOfVersions',
      Utils.utf8ToHex(serviceType)
    )
    return parseInt(await method.call())
  }

  async getServiceTypeInfo(serviceType: string) {
    const method = await this.getMethod(
      'getServiceTypeInfo',
      Utils.utf8ToHex(serviceType)
    )
    const response = await method.call()
    return {
      isValid: response[0],
      minStake: Utils.toBN(response[1]),
      maxStake: Utils.toBN(response[2])
    }
  }
}
