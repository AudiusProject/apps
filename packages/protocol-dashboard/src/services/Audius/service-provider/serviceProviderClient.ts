import {
  ServiceProviderDecreaseStakeEvent,
  ServiceProviderDeregisteredEvent,
  ServiceProviderIncreaseStakeEvent,
  ServiceProviderRegisteredEvent
} from 'models/TimelineEvents'
import {
  ServiceType,
  Address,
  Amount,
  BlockNumber,
  ServiceProvider,
  TxReceipt,
  Node,
  Permission,
  Wallet
} from 'types'

import { AudiusClient } from '../AudiusClient'

import {
  GetDecreasedStakeCancelledEventsResponse,
  GetDecreasedStakeEvaluatedEventsResponse,
  GetDecreasedStakeRequestedEventsResponse,
  GetIncreasedStakeEventResponse,
  GetDeregisteredServiceProviderEventsResponse,
  GetPendingDecreaseStakeRequestResponse,
  GetRegisteredServiceProviderEventsResponse,
  GetServiceEndpointInfoFromAddressResponse,
  GetServiceProviderIdsFromAddressResponse,
  GetServiceProviderListResponse,
  RegisterWithDelegateResponse,
  RegisterResponse,
  IncreaseStakeResponse,
  DecreaseStakeResponse,
  DeregisterResponse
} from './types'

export default class ServiceProviderClient {
  aud: AudiusClient

  constructor(aud: AudiusClient) {
    this.aud = aud
  }

  getContract() {
    return this.aud.libs.ethContracts.ServiceProviderFactoryClient
  }

  async getTotalServiceTypeProviders(
    serviceType: ServiceType
  ): Promise<number> {
    await this.aud.hasPermissions()
    const numberServiceProviders =
      await this.getContract().getTotalServiceTypeProviders(serviceType)
    return numberServiceProviders
  }

  async getServiceProviderIdFromEndpoint(endpoint: string): Promise<number> {
    await this.aud.hasPermissions()
    const spId =
      await this.getContract().getServiceProviderIdFromEndpoint(endpoint)
    return spId
  }

  async getServiceEndpointInfo(
    serviceType: ServiceType,
    spID: number
  ): Promise<Node> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getServiceEndpointInfo(
      serviceType,
      spID
    )
    return info
  }

  async getServiceProviderInfoFromEndpoint(endpoint: string): Promise<Node> {
    await this.aud.hasPermissions()
    const info =
      await this.getContract().getServiceProviderInfoFromEndpoint(endpoint)
    return info
  }

  async getServiceProviderIdsFromAddress(
    ownerAddress: Address,
    serviceType: ServiceType
  ): Promise<GetServiceProviderIdsFromAddressResponse> {
    await this.aud.hasPermissions()
    const ids = await this.getContract().getServiceProviderIdsFromAddress(
      ownerAddress,
      serviceType
    )
    return ids
  }

  async getPendingDecreaseStakeRequest(
    account: Address
  ): Promise<GetPendingDecreaseStakeRequestResponse> {
    await this.aud.hasPermissions()
    const pendingDecreaseStake =
      await this.getContract().getPendingDecreaseStakeRequest(account)
    return pendingDecreaseStake
  }

  async cancelDecreaseStakeRequest(account: Address): Promise<void> {
    await this.aud.hasPermissions()
    await this.getContract().cancelDecreaseStakeRequest(account)
  }

  async getLockupExpiry(account: Address): Promise<BlockNumber> {
    await this.aud.hasPermissions()
    const lockupExpiryBlock = await this.getContract().getLockupExpiry(account)
    return lockupExpiryBlock
  }

  async getServiceProviderIdFromAddress(
    ownerAddress: Address,
    serviceType: ServiceType
  ): Promise<number | null> {
    await this.aud.hasPermissions()
    const id = await this.getContract().getServiceProviderIdFromAddress(
      ownerAddress,
      serviceType
    )
    return id
  }

  async getServiceEndpointInfoFromAddress(
    ownerAddress: Address,
    serviceType: ServiceType
  ): Promise<GetServiceEndpointInfoFromAddressResponse> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getServiceEndpointInfoFromAddress(
      ownerAddress,
      serviceType
    )
    return info
  }

  async getServiceProviderList(
    serviceType: ServiceType
  ): Promise<GetServiceProviderListResponse> {
    await this.aud.hasPermissions()
    const serviceProviderList =
      await this.getContract().getServiceProviderList(serviceType)
    return serviceProviderList
  }

  async getServiceProviderDetails(account: Address): Promise<ServiceProvider> {
    await this.aud.hasPermissions()
    const serviceProvider =
      await this.getContract().getServiceProviderDetails(account)
    return serviceProvider
  }

  async getPendingUpdateDeployerCutRequest(
    ownerAddress: Address
  ): Promise<{ newDeployerCut: number; lockupExpiryBlock: number }> {
    await this.aud.hasPermissions()
    const info =
      await this.getContract().getPendingUpdateDeployerCutRequest(ownerAddress)
    return info
  }

  async getDeregisteredService(
    serviceType: ServiceType,
    spID: number
  ): Promise<{
    delegateOwnerWallet: Address
    endpoint: string
    owner: Wallet
  }> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getDeregisteredService({
      serviceType,
      spID
    })
    return info
  }

  async getDecreaseStakeLockupDuration(): Promise<number> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getDecreaseStakeLockupDuration()
    return info
  }

  async getDeployerCutLockupDuration(): Promise<number> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getDeployerCutLockupDuration()
    return info
  }

  async getRegisteredServiceProviderEvents(
    wallet: Address
  ): Promise<ServiceProviderRegisteredEvent[]> {
    await this.aud.hasPermissions()
    const events: GetRegisteredServiceProviderEventsResponse[] =
      await this.getContract().getRegisteredServiceProviderEvents({
        owner: wallet
      })
    return events.map((event) => ({
      ...event,
      _type: 'ServiceProviderRegistered'
    }))
  }

  async getDeregisteredServiceProviderEvents(
    wallet: Address
  ): Promise<ServiceProviderDeregisteredEvent[]> {
    await this.aud.hasPermissions()
    const events: GetDeregisteredServiceProviderEventsResponse[] =
      await this.getContract().getDeregisteredServiceProviderEvents({
        owner: wallet
      })
    return events.map((event) => ({
      ...event,
      _type: 'ServiceProviderDeregistered'
    }))
  }

  async getIncreasedStakeEvents(
    wallet: Address
  ): Promise<ServiceProviderIncreaseStakeEvent[]> {
    await this.aud.hasPermissions()
    const events: GetIncreasedStakeEventResponse[] =
      await this.getContract().getIncreasedStakeEvents({
        owner: wallet
      })
    return events.map((event) => ({
      ...event,
      _type: 'ServiceProviderIncreaseStake'
    }))
  }

  async getDecreasedStakeEvaluatedEvents(
    wallet: Address
  ): Promise<ServiceProviderDecreaseStakeEvent[]> {
    await this.aud.hasPermissions()
    const events: GetDecreasedStakeEvaluatedEventsResponse[] =
      await this.getContract().getDecreasedStakeEvaluatedEvents({
        owner: wallet
      })
    return events.map((event) => ({
      _type: 'ServiceProviderDecreaseStake',
      blockNumber: event.blockNumber,
      owner: event.owner,
      decreaseAmount: event.decreaseAmount,
      data: {
        newStakeAmount: event.newStakeAmount,
        _type: 'Evaluated'
      }
    }))
  }

  async getDecreasedStakeRequestedEvents(
    wallet: Address
  ): Promise<ServiceProviderDecreaseStakeEvent[]> {
    await this.aud.hasPermissions()
    const events: GetDecreasedStakeRequestedEventsResponse[] =
      await this.getContract().getDecreasedStakeRequestedEvents({
        owner: wallet
      })
    return events.map((event) => ({
      _type: 'ServiceProviderDecreaseStake',
      blockNumber: event.blockNumber,
      owner: event.owner,
      decreaseAmount: event.decreaseAmount,
      data: {
        lockupExpiryBlock: event.lockupExpiryBlock,
        _type: 'Requested'
      }
    }))
  }

  async getDecreasedStakeCancelledEvents(wallet: Address): Promise<any> {
    await this.aud.hasPermissions()
    const events: GetDecreasedStakeCancelledEventsResponse[] =
      await this.getContract().getDecreasedStakeCancelledEvents({
        owner: wallet
      })
    return events.map((event) => ({
      _type: 'ServiceProviderDecreaseStake',
      blockNumber: event.blockNumber,
      owner: event.owner,
      decreaseAmount: event.decreaseAmount,
      data: {
        lockupExpiryBlock: event.lockupExpiryBlock,
        _type: 'Cancelled'
      }
    }))
  }

  async registerWithDelegate(
    serviceType: ServiceType,
    endpoint: string,
    amount: Amount,
    delegateOwnerWallet: Address
  ): Promise<RegisterWithDelegateResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const registeredService = await this.getContract().registerWithDelegate(
      serviceType,
      endpoint,
      amount,
      delegateOwnerWallet,
      false
    )
    return registeredService
  }

  async register(
    serviceType: ServiceType,
    endpoint: string,
    amount: Amount
  ): Promise<RegisterResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const registeredService = await this.getContract().register(
      serviceType,
      endpoint,
      amount,
      false
    )
    return registeredService
  }

  async increaseStake(amount: Amount): Promise<IncreaseStakeResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const increaseTransaction = await this.getContract().increaseStake(amount)
    return increaseTransaction
  }

  async requestDecreaseStake(amount: Amount): Promise<BlockNumber> {
    await this.aud.hasPermissions(Permission.WRITE)
    const lockupExpiryBlock =
      await this.getContract().requestDecreaseStake(amount)
    return lockupExpiryBlock
  }

  async decreaseStake(): Promise<DecreaseStakeResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const decreasedStake = await this.getContract().decreaseStake()
    return decreasedStake
  }

  async deregister(
    serviceType: ServiceType,
    endpoint: string
  ): Promise<DeregisterResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const decreasedStake = await this.getContract().deregister(
      serviceType,
      endpoint
    )
    return decreasedStake
  }

  async updateDelegateOwnerWallet(
    serviceType: ServiceType,
    endpoint: string,
    updatedDelegateOwnerWallet: Address
  ): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().updateDelegateOwnerWallet(
      serviceType,
      endpoint,
      updatedDelegateOwnerWallet
    )
    return info
  }

  async updateEndpoint(
    serviceType: ServiceType,
    oldEndpoint: string,
    newEndpoint: string
  ): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().updateEndpoint(
      serviceType,
      oldEndpoint,
      newEndpoint
    )
    return info
  }

  async requestUpdateDeployerCut(
    ownerAddress: Address,
    deployerCut: number
  ): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().requestUpdateDeployerCut(
      ownerAddress,
      deployerCut
    )
    return info
  }

  async cancelUpdateDeployerCut(ownerAddress: Address): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().cancelUpdateDeployerCut(ownerAddress)
    return info
  }

  async updateDeployerCut(ownerAddress: Address): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().updateDeployerCut(ownerAddress)
    return info
  }
}
