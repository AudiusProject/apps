import axios, { AxiosRequestConfig } from 'axios'
import type BN from 'bn.js'
import { range } from 'lodash'
import urlJoin from 'proper-url-join'

import { ContractABI, Logger, Utils } from '../../utils'
import type { GetRegistryAddress } from '../contracts/ContractClient'
import { GovernedContractClient } from '../contracts/GovernedContractClient'
import type { EthWeb3Manager } from '../ethWeb3Manager'

import type { AudiusTokenClient } from './AudiusTokenClient'
import type { GovernanceClient } from './GovernanceClient'
import type { StakingProxyClient } from './StakingProxyClient'

type GetEvent = {
  serviceType: string
  owner: string
  queryStartBlock: number
}

type Filter = { _owner?: string; _serviceType?: string }

export class ServiceProviderFactoryClient extends GovernedContractClient {
  audiusTokenClient: AudiusTokenClient
  stakingProxyClient: StakingProxyClient
  isDebug: boolean

  constructor(
    ethWeb3Manager: EthWeb3Manager,
    contractABI: ContractABI['abi'],
    contractRegistryKey: string,
    getRegistryAddress: GetRegistryAddress,
    audiusTokenClient: AudiusTokenClient,
    stakingProxyClient: StakingProxyClient,
    governanceClient: GovernanceClient,
    logger: Logger = console,
    isDebug = false
  ) {
    super(
      ethWeb3Manager,
      contractABI,
      contractRegistryKey,
      getRegistryAddress,
      governanceClient,
      logger
    )
    this.audiusTokenClient = audiusTokenClient
    this.stakingProxyClient = stakingProxyClient
    this.isDebug = isDebug
  }

  async registerWithDelegate(
    serviceType: string,
    endpoint: string,
    amount: number | string | BN,
    delegateOwnerWallet: string,
    performHealthCheck: boolean = true
  ) {
    const sanitizedEndpoint = endpoint.replace(/\/$/, '')

    if (!this.isDebug && !Utils.isHttps(sanitizedEndpoint)) {
      throw new Error('Domain name not using https protocol!')
    }

    if (!this.isDebug && !Utils.isFQDN(sanitizedEndpoint)) {
      throw new Error('Not a fully qualified domain name!')
    }
    if (!Number.isInteger(amount) && !Utils.isBN(amount as string)) {
      throw new Error('Invalid amount')
    }

    if (performHealthCheck) {
      const requestUrl = urlJoin(sanitizedEndpoint, 'health_check')
      const axiosRequestObj: AxiosRequestConfig = {
        url: requestUrl,
        method: 'get',
        timeout: 1000,
        params: {
          allow_unregistered: 'true'
        }
      }
      const resp = await axios(axiosRequestObj)
      const endpointServiceType = resp.data.data.service

      if (serviceType !== endpointServiceType) {
        throw new Error(
          'Attempting to register endpoint with mismatched service type'
        )
      }
    }

    const contractAddress = await this.stakingProxyClient.getAddress()
    const tx0 = await this.audiusTokenClient.approve(
      contractAddress,
      amount as BN
    )

    const method = await this.getMethod(
      'register',
      Utils.utf8ToHex(serviceType),
      sanitizedEndpoint,
      amount,
      delegateOwnerWallet
    )
    // @ts-expect-error TODO: this seems incorrect
    const tx = await this.web3Manager.sendTransaction(method, 1000000)
    const returnValues = tx.events?.RegisteredServiceProvider?.returnValues
    return {
      txReceipt: tx,
      spID: parseInt(returnValues._spID),
      serviceType: Utils.hexToUtf8(returnValues._serviceType),
      owner: returnValues._owner,
      endpoint: returnValues._endpoint,
      tokenApproveReceipt: tx0
    }
  }

  async register(
    serviceType: string,
    endpoint: string,
    amount: BN,
    performHealthCheck: boolean = true
  ) {
    return await this.registerWithDelegate(
      serviceType,
      endpoint,
      amount,
      this.web3Manager.getWalletAddress(),
      performHealthCheck
    )
  }

  async getRegisteredServiceProviderEvents({
    serviceType,
    owner,
    queryStartBlock = 0
  }: GetEvent) {
    const contract = await this.getContract()
    const filter: Filter = {}
    if (owner) {
      filter._owner = owner
    }
    if (serviceType) {
      filter._serviceType = serviceType
    }
    const events = await contract.getPastEvents('RegisteredServiceProvider', {
      fromBlock: queryStartBlock,
      filter
    })

    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      spID: parseInt(event.returnValues._spID),
      serviceType: Utils.hexToUtf8(event.returnValues._serviceType),
      owner: event.returnValues._owner,
      endpoint: event.returnValues._endpoint,
      stakeAmount: Utils.toBN(event.returnValues._stakeAmout)
    }))
  }

  async getDeregisteredServiceProviderEvents({
    serviceType,
    owner,
    queryStartBlock = 0
  }: GetEvent) {
    const contract = await this.getContract()
    const filter: Filter = {}
    if (owner) {
      filter._owner = owner
    }
    if (serviceType) {
      filter._serviceType = serviceType
    }
    const events = await contract.getPastEvents('DeregisteredServiceProvider', {
      fromBlock: queryStartBlock,
      filter
    })
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      spID: parseInt(event.returnValues._spID),
      serviceType: Utils.hexToUtf8(event.returnValues._serviceType),
      owner: event.returnValues._owner,
      endpoint: event.returnValues._endpoint,
      stakeAmount: Utils.toBN(event.returnValues._stakeAmount)
    }))
  }

  async getIncreasedStakeEvents({
    owner,
    queryStartBlock = 0
  }: {
    owner: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents('IncreasedStake', {
      fromBlock: queryStartBlock,
      filter: {
        _owner: owner
      }
    })
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      owner: event.returnValues._owner,
      increaseAmount: Utils.toBN(event.returnValues._increaseAmount),
      newStakeAmount: Utils.toBN(event.returnValues._newStakeAmount)
    }))
  }

  async getDecreasedStakeEvaluatedEvents({
    owner,
    queryStartBlock = 0
  }: {
    owner: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents(
      'DecreaseStakeRequestEvaluated',
      {
        fromBlock: queryStartBlock,
        filter: {
          _owner: owner
        }
      }
    )
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      owner: event.returnValues._owner,
      decreaseAmount: Utils.toBN(event.returnValues._decreaseAmount),
      newStakeAmount: Utils.toBN(event.returnValues._newStakeAmount)
    }))
  }

  async getDecreasedStakeRequestedEvents({
    owner,
    queryStartBlock = 0
  }: {
    owner: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents('DecreaseStakeRequested', {
      fromBlock: queryStartBlock,
      filter: {
        _owner: owner
      }
    })
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      owner: event.returnValues._owner,
      decreaseAmount: Utils.toBN(event.returnValues._decreaseAmount),
      lockupExpiryBlock: parseInt(event.returnValues._lockupExpiryBlock)
    }))
  }

  async getDecreasedStakeCancelledEvents({
    owner,
    queryStartBlock = 0
  }: {
    owner: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents(
      'DecreaseStakeRequestCancelled',
      {
        fromBlock: queryStartBlock,
        filter: {
          _owner: owner
        }
      }
    )
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      owner: event.returnValues._owner,
      decreaseAmount: Utils.toBN(event.returnValues._decreaseAmount),
      lockupExpiryBlock: parseInt(event.returnValues._lockupExpiryBlock)
    }))
  }

  async getDeregisteredService({
    serviceType,
    spID,
    queryStartBlock = 0
  }: {
    serviceType: string
    spID: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const service: {
      endpoint: string
      delegateOwnerWallet: string
      owner?: string
    } = { endpoint: '', delegateOwnerWallet: '' }
    const registerEvents = await contract.getPastEvents(
      'RegisteredServiceProvider',
      {
        fromBlock: queryStartBlock,
        filter: {
          _spID: spID,
          _serviceType: Utils.utf8ToHex(serviceType)
        }
      }
    )

    if (registerEvents.length > 0) {
      const { _endpoint, _owner } = registerEvents[registerEvents.length - 1]
        ?.returnValues as { _endpoint: string; _owner: string }
      service.endpoint = _endpoint
      service.owner = _owner
    }

    const endpointUpdateEvents = await contract.getPastEvents(
      'EndpointUpdated',
      {
        fromBlock: queryStartBlock,
        filter: {
          _spID: spID,
          _serviceType: Utils.utf8ToHex(serviceType)
        }
      }
    )

    if (endpointUpdateEvents.length > 0) {
      const { _newEndpoint } = endpointUpdateEvents[
        endpointUpdateEvents.length - 1
      ]?.returnValues as { _newEndpoint: string }
      service.endpoint = _newEndpoint
    }

    const walletEvents = await contract.getPastEvents(
      'DelegateOwnerWalletUpdated',
      {
        fromBlock: queryStartBlock,
        filter: {
          _spID: spID,
          _serviceType: Utils.utf8ToHex(serviceType)
        }
      }
    )

    if (walletEvents.length > 0) {
      const { _updatedWallet } = walletEvents[walletEvents.length - 1]
        ?.returnValues as { _updatedWallet: string }
      service.delegateOwnerWallet = _updatedWallet
    }

    return service
  }

  async increaseStake(amount: BN) {
    const contractAddress = await this.stakingProxyClient.getAddress()
    const tx0 = await this.audiusTokenClient.approve(contractAddress, amount)
    const method = await this.getMethod('increaseStake', amount)
    // @ts-expect-error TODO: sendTransaction's signature seems pretty different
    const tx = await this.web3Manager.sendTransaction(method, 1000000)
    return {
      txReceipt: tx,
      tokenApproveReceipt: tx0
    }
  }

  async requestDecreaseStake(amount: BN) {
    const requestDecreaseMethod = await this.getMethod(
      'requestDecreaseStake',
      amount
    )
    await this.web3Manager.sendTransaction(
      requestDecreaseMethod,
      // @ts-expect-error TODO: sendTransaction's signature seems pretty different
      1000000
    )

    const account = this.web3Manager.getWalletAddress()
    const lockupExpiryBlock = await this.getLockupExpiry(account)
    return parseInt(lockupExpiryBlock as unknown as string)
  }

  async getPendingDecreaseStakeRequest(account: string) {
    const requestInfoMethod = await this.getMethod(
      'getPendingDecreaseStakeRequest',
      account
    )
    const { amount, lockupExpiryBlock } = await requestInfoMethod.call()
    return {
      amount: Utils.toBN(amount),
      lockupExpiryBlock: parseInt(lockupExpiryBlock)
    }
  }

  async getDecreaseStakeLockupDuration() {
    const requestInfoMethod = await this.getMethod(
      'getDecreaseStakeLockupDuration'
    )
    const info = await requestInfoMethod.call()
    return parseInt(info)
  }

  async getDeployerCutLockupDuration() {
    const requestInfoMethod = await this.getMethod(
      'getDeployerCutLockupDuration'
    )
    const info = await requestInfoMethod.call()
    return parseInt(info)
  }

  async cancelDecreaseStakeRequest(account: string) {
    const requestCancelDecreaseMethod = await this.getMethod(
      'cancelDecreaseStakeRequest',
      account
    )
    await this.web3Manager.sendTransaction(
      requestCancelDecreaseMethod,
      // @ts-expect-error TODO: double check sendTransaction
      1000000
    )
  }

  async getLockupExpiry(account: string) {
    const { lockupExpiryBlock } =
      await this.getPendingDecreaseStakeRequest(account)
    return parseInt(lockupExpiryBlock as unknown as string)
  }

  async decreaseStake() {
    const method = await this.getMethod('decreaseStake')
    // @ts-expect-error TODO: double check sendTransaction
    const tx = await this.web3Manager.sendTransaction(method, 1000000)

    return {
      txReceipt: tx
    }
  }

  async deregister(serviceType: string, endpoint: string) {
    const method = await this.getMethod(
      'deregister',
      Utils.utf8ToHex(serviceType),
      endpoint
    )
    const tx = await this.web3Manager.sendTransaction(method)
    const returnValues = tx.events?.DeregisteredServiceProvider?.returnValues

    return {
      txReceipt: tx,
      spID: parseInt(returnValues._spID),
      serviceType: Utils.hexToUtf8(returnValues._serviceType),
      owner: returnValues._owner,
      endpoint: returnValues._endpoint
    }
  }

  async getTotalServiceTypeProviders(serviceType: string) {
    const method = await this.getMethod(
      'getTotalServiceTypeProviders',
      Utils.utf8ToHex(serviceType)
    )
    const count = await method.call()
    return parseInt(count)
  }

  async getServiceProviderIdFromEndpoint(endpoint: string) {
    const method = await this.getMethod(
      'getServiceProviderIdFromEndpoint',
      endpoint
    )
    const info = await method.call()
    return parseInt(info)
  }

  async getServiceProviderInfo(serviceType: string, serviceId: number) {
    return await this.getServiceEndpointInfo(serviceType, serviceId)
  }

  async getServiceEndpointInfo(serviceType: string, serviceId: number) {
    const method = await this.getMethod(
      'getServiceEndpointInfo',
      Utils.utf8ToHex(serviceType),
      serviceId
    )
    const info = await method.call()
    return {
      owner: info.owner,
      endpoint: info.endpoint.replace(/\/$/, ''),
      spID: parseInt(serviceId as unknown as string),
      type: serviceType,
      blockNumber: parseInt(info.blockNumber),
      delegateOwnerWallet: info.delegateOwnerWallet
    }
  }

  async getServiceProviderInfoFromEndpoint(endpoint: string) {
    const requestUrl = urlJoin(endpoint, 'health_check')
    const axiosRequestObj: AxiosRequestConfig = {
      url: requestUrl,
      method: 'get',
      timeout: 1000
    }

    const resp = await axios(axiosRequestObj)
    const serviceType = resp.data.data.service

    const serviceProviderId =
      await this.getServiceProviderIdFromEndpoint(endpoint)
    const info = await this.getServiceEndpointInfo(
      serviceType,
      serviceProviderId
    )
    return info
  }

  async getServiceProviderIdsFromAddress(
    ownerAddress: string,
    serviceType: string
  ) {
    const method = await this.getMethod(
      'getServiceProviderIdsFromAddress',
      ownerAddress,
      Utils.utf8ToHex(serviceType)
    )
    const info: string[] = await method.call()
    return info.map((id) => parseInt(id))
  }

  async getServiceProviderIdFromAddress(
    ownerAddress: string,
    serviceType: string
  ) {
    const infos = await this.getServiceProviderIdsFromAddress(
      ownerAddress,
      serviceType
    )
    return infos[0] as number
  }

  async getServiceEndpointInfoFromAddress(
    ownerAddress: string,
    serviceType: string
  ) {
    const spId = await this.getServiceProviderIdFromAddress(
      ownerAddress,
      serviceType
    )

    const spInfo = [await this.getServiceEndpointInfo(serviceType, spId)]
    return spInfo
  }

  async getServiceProviderList(serviceType: string) {
    const numberOfProviders =
      await this.getTotalServiceTypeProviders(serviceType)

    const providerList = await Promise.all(
      range(1, numberOfProviders + 1).map(
        async (i) => await this.getServiceEndpointInfo(serviceType, i)
      )
    )
    return providerList.filter((provider) => provider.endpoint !== '')
  }

  async updateDecreaseStakeLockupDuration(duration: string) {
    const method = await this.getGovernedMethod(
      'updateDecreaseStakeLockupDuration',
      duration
    )
    return await this.web3Manager.sendTransaction(method)
  }

  async getServiceProviderDetails(serviceProviderAddress: string) {
    const method = await this.getMethod(
      'getServiceProviderDetails',
      serviceProviderAddress
    )
    const info = await method.call()
    return {
      deployerCut: parseInt(info.deployerCut),
      deployerStake: Utils.toBN(info.deployerStake),
      maxAccountStake: Utils.toBN(info.maxAccountStake),
      minAccountStake: Utils.toBN(info.minAccountStake),
      numberOfEndpoints: parseInt(info.numberOfEndpoints),
      validBounds: info.validBounds
    }
  }

  async updateDelegateOwnerWallet(
    serviceType: string,
    endpoint: string,
    updatedDelegateOwnerWallet: string
  ) {
    const method = await this.getMethod(
      'updateDelegateOwnerWallet',
      Utils.utf8ToHex(serviceType),
      endpoint,
      updatedDelegateOwnerWallet
    )

    const tx = await this.web3Manager.sendTransaction(method)
    return tx
  }

  async updateEndpoint(
    serviceType: string,
    oldEndpoint: string,
    newEndpoint: string
  ) {
    const method = await this.getMethod(
      'updateEndpoint',
      Utils.utf8ToHex(serviceType),
      oldEndpoint,
      newEndpoint
    )
    const tx = await this.web3Manager.sendTransaction(method)
    return tx
  }

  async requestUpdateDeployerCut(ownerAddress: string, deployerCut: string) {
    const method = await this.getMethod(
      'requestUpdateDeployerCut',
      ownerAddress,
      deployerCut
    )
    const tx = await this.web3Manager.sendTransaction(method)
    return tx
  }

  async getPendingUpdateDeployerCutRequest(ownerAddress: string) {
    const method = await this.getMethod(
      'getPendingUpdateDeployerCutRequest',
      ownerAddress
    )
    const { lockupExpiryBlock, newDeployerCut } = await method.call()
    return {
      lockupExpiryBlock: parseInt(lockupExpiryBlock),
      newDeployerCut: parseInt(newDeployerCut)
    }
  }

  async cancelUpdateDeployerCut(ownerAddress: string) {
    const method = await this.getMethod('cancelUpdateDeployerCut', ownerAddress)
    const tx = await this.web3Manager.sendTransaction(method)
    return tx
  }

  async updateDeployerCut(ownerAddress: string) {
    const method = await this.getMethod('updateDeployerCut', ownerAddress)
    const tx = await this.web3Manager.sendTransaction(method)
    return tx
  }

  async updateServiceProviderStake(ownerAddress: string, newAmount: string) {
    const method = await this.getMethod(
      'updateServiceProviderStake',
      ownerAddress,
      newAmount
    )
    const tx = await this.web3Manager.sendTransaction(method)
    return tx
  }
}
