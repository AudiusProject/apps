import { ServiceType, Version, BigNumber } from 'types'

import { AudiusClient } from './AudiusClient'

export type GetValidServiceTypesResponse = Array<ServiceType>
export type GetServiceTypeInfoResponse = {
  isValid: boolean
  minStake: BigNumber
  maxStake: BigNumber
}

export default class NodeType {
  aud: AudiusClient

  constructor(aud: AudiusClient) {
    this.aud = aud
  }

  getContract() {
    return this.aud.libs.ethContracts.ServiceTypeManagerClient
  }

  async getValidServiceTypes(): Promise<GetValidServiceTypesResponse> {
    await this.aud.hasPermissions()
    const serviceTypes = await this.getContract().getValidServiceTypes()
    return serviceTypes
  }

  async getCurrentVersion(serviceType: ServiceType): Promise<Version> {
    await this.aud.hasPermissions()
    const version = await this.getContract().getCurrentVersion(serviceType)
    return version
  }

  async getVersion(
    serviceType: ServiceType,
    versionIndex: number
  ): Promise<Version> {
    await this.aud.hasPermissions()
    const version = await this.getContract().getVersion(
      serviceType,
      versionIndex
    )
    return version
  }

  async getNumberOfVersions(serviceType: ServiceType): Promise<number> {
    await this.aud.hasPermissions()
    const numberOfVersions =
      await this.getContract().getNumberOfVersions(serviceType)
    return numberOfVersions
  }

  async getServiceTypeInfo(
    serviceType: ServiceType
  ): Promise<GetServiceTypeInfoResponse> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getServiceTypeInfo(serviceType)
    return info
  }
}
