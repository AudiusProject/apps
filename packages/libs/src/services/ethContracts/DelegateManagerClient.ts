import type BN from 'bn.js'

import { ContractABI, Logger, Utils } from '../../utils'
import type { GetRegistryAddress } from '../contracts/ContractClient'
import { GovernedContractClient } from '../contracts/GovernedContractClient'
import type { EthWeb3Manager } from '../ethWeb3Manager'

import type { AudiusTokenClient } from './AudiusTokenClient'
import type { GovernanceClient } from './GovernanceClient'
import type { StakingProxyClient } from './StakingProxyClient'

type GetEvent = {
  delegator: string
  serviceProvider: string
  queryStartBlock: number
}

export class DelegateManagerClient extends GovernedContractClient {
  audiusTokenClient: AudiusTokenClient
  stakingProxyClient: StakingProxyClient

  constructor(
    ethWeb3Manager: EthWeb3Manager,
    contractABI: ContractABI['abi'],
    contractRegistryKey: string,
    getRegistryAddress: GetRegistryAddress,
    audiusTokenClient: AudiusTokenClient,
    stakingProxyClient: StakingProxyClient,
    governanceClient: GovernanceClient,
    logger: Logger = console
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
  }

  async delegateStake(targetSP: string, amount: BN) {
    const contractAddress = await this.stakingProxyClient.getAddress()
    const tx0 = await this.audiusTokenClient.approve(contractAddress, amount)
    const method = await this.getMethod('delegateStake', targetSP, amount)
    const tx = await this.web3Manager.sendTransaction(method)

    const returnValues = tx.events?.IncreaseDelegatedStake?.returnValues

    return {
      txReceipt: tx,
      tokenApproveReceipt: tx0,
      delegator: returnValues?._delegator,
      serviceProvider: returnValues?._serviceProvider,
      increaseAmount: Utils.toBN(returnValues?._increaseAmount)
    }
  }

  async getIncreaseDelegateStakeEvents({
    delegator,
    serviceProvider,
    queryStartBlock = 0
  }: GetEvent) {
    const contract = await this.getContract()
    const filter: { _delegator?: string; _serviceProvider?: string } = {}
    if (delegator) {
      filter._delegator = delegator
    } else {
      filter._serviceProvider = serviceProvider
    }
    const events = await contract.getPastEvents('IncreaseDelegatedStake', {
      fromBlock: queryStartBlock,
      filter
    })

    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      delegator: event.returnValues._delegator,
      increaseAmount: Utils.toBN(event.returnValues._increaseAmount),
      serviceProvider: event.returnValues._serviceProvider
    }))
  }

  async getDecreaseDelegateStakeEvents({
    delegator,
    serviceProvider,
    queryStartBlock = 0
  }: GetEvent) {
    const contract = await this.getContract()
    const filter: { _delegator?: string; _serviceProvider?: string } = {}
    if (delegator) {
      filter._delegator = delegator
    }
    if (serviceProvider) {
      filter._serviceProvider = serviceProvider
    }

    const events = await contract.getPastEvents(
      'UndelegateStakeRequestEvaluated',
      {
        fromBlock: queryStartBlock,
        filter
      }
    )
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      delegator: event.returnValues._delegator,
      amount: Utils.toBN(event.returnValues._amount),
      serviceProvider: event.returnValues._serviceProvider
    }))
  }

  async getUndelegateStakeRequestedEvents({
    delegator,
    serviceProvider,
    queryStartBlock = 0
  }: GetEvent) {
    const contract = await this.getContract()
    const filter: { _delegator?: string; _serviceProvider?: string } = {}
    if (delegator) {
      filter._delegator = delegator
    }
    if (serviceProvider) {
      filter._serviceProvider = serviceProvider
    }

    const events = await contract.getPastEvents('UndelegateStakeRequested', {
      fromBlock: queryStartBlock,
      filter
    })

    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      lockupExpiryBlock: parseInt(event.returnValues._lockupExpiryBlock),
      delegator: event.returnValues._delegator,
      amount: Utils.toBN(event.returnValues._amount),
      serviceProvider: event.returnValues._serviceProvider
    }))
  }

  async getUndelegateStakeCancelledEvents({
    delegator,
    serviceProvider,
    queryStartBlock = 0
  }: GetEvent) {
    const contract = await this.getContract()
    const filter: { _delegator?: string; _serviceProvider?: string } = {}
    if (delegator) {
      filter._delegator = delegator
    }
    if (serviceProvider) {
      filter._serviceProvider = serviceProvider
    }

    const events = await contract.getPastEvents(
      'UndelegateStakeRequestCancelled',
      {
        fromBlock: queryStartBlock,
        filter
      }
    )

    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      delegator: event.returnValues._delegator,
      amount: Utils.toBN(event.returnValues._amount),
      serviceProvider: event.returnValues._serviceProvider
    }))
  }

  async getClaimEvents({
    claimer,
    queryStartBlock = 0
  }: {
    claimer: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents('Claim', {
      fromBlock: queryStartBlock,
      filter: {
        _claimer: claimer
      }
    })
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      claimer: event.returnValues._claimer,
      rewards: Utils.toBN(event.returnValues._rewards),
      newTotal: Utils.toBN(event.returnValues._newTotal)
    }))
  }

  async getSlashEvents({
    target,
    queryStartBlock = 0
  }: {
    target: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents('Slash', {
      fromBlock: queryStartBlock,
      filter: {
        _target: target
      }
    })
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      target: event.returnValues._target,
      amount: Utils.toBN(event.returnValues._amount),
      newTotal: Utils.toBN(event.returnValues._newTotal)
    }))
  }

  async getDelegatorRemovedEvents({
    target,
    queryStartBlock = 0
  }: {
    target: string
    queryStartBlock: number
  }) {
    const contract = await this.getContract()
    const events = await contract.getPastEvents('DelegatorRemoved', {
      fromBlock: queryStartBlock,
      filter: {
        _target: target
      }
    })
    return events.map((event) => ({
      blockNumber: parseInt(event.blockNumber as unknown as string),
      serviceProvider: event.returnValues._serviceProvider,
      delegator: event.returnValues._delegator,
      unstakedAmount: Utils.toBN(event.returnValues._unstakedAmount)
    }))
  }

  async requestUndelegateStake(targetSP: string, amount: BN) {
    const method = await this.getMethod(
      'requestUndelegateStake',
      targetSP,
      amount
    )
    return await this.web3Manager.sendTransaction(method)
  }

  async cancelUndelegateStakeRequest() {
    const method = await this.getMethod('cancelUndelegateStakeRequest')
    return await this.web3Manager.sendTransaction(method)
  }

  async undelegateStake() {
    const method = await this.getMethod('undelegateStake')

    const tx = await this.web3Manager.sendTransaction(method)

    const returnValues =
      tx.events?.UndelegateStakeRequestEvaluated?.returnValues

    return {
      txReceipt: tx,
      delegator: returnValues._delegator,
      serviceProvider: returnValues._serviceProvider,
      decreaseAmount: Utils.toBN(returnValues._amount)
    }
  }

  async claimRewards(serviceProvider: string, txRetries = 5) {
    const method = await this.getMethod('claimRewards', serviceProvider)
    return await this.web3Manager.sendTransaction(method, null, null, txRetries)
  }

  async requestRemoveDelegator(serviceProvider: string, delegator: string) {
    const method = await this.getMethod(
      'requestRemoveDelegator',
      serviceProvider,
      delegator
    )
    return await this.web3Manager.sendTransaction(method)
  }

  async cancelRemoveDelegatorRequest(
    serviceProvider: string,
    delegator: string
  ) {
    const method = await this.getMethod(
      'cancelRemoveDelegatorRequest',
      serviceProvider,
      delegator
    )
    return await this.web3Manager.sendTransaction(method)
  }

  async removeDelegator(serviceProvider: string, delegator: string) {
    const method = await this.getMethod(
      'removeDelegator',
      serviceProvider,
      delegator
    )
    const tx = await this.web3Manager.sendTransaction(method)
    const returnValues =
      tx.events?.RemoveDelegatorRequestEvaluated?.returnValues
    return {
      txReceipt: tx,
      delegator: returnValues._delegator,
      serviceProvider: returnValues._serviceProvider,
      unstakedAmount: Utils.toBN(returnValues._unstakedAmount)
    }
  }

  async getDelegatorsList(serviceProvider: string) {
    const method = await this.getMethod('getDelegatorsList', serviceProvider)
    const info = await method.call()
    return info
  }

  async getTotalDelegatedToServiceProvider(serviceProvider: string) {
    const method = await this.getMethod(
      'getTotalDelegatedToServiceProvider',
      serviceProvider
    )
    const info = await method.call()
    return Utils.toBN(info)
  }

  async getTotalDelegatorStake(delegator: string) {
    const method = await this.getMethod('getTotalDelegatorStake', delegator)
    const info = await method.call()
    return Utils.toBN(info)
  }

  async getTotalLockedDelegationForServiceProvider(serviceProvider: string) {
    const method = await this.getMethod(
      'getTotalLockedDelegationForServiceProvider',
      serviceProvider
    )
    const info = await method.call()
    return Utils.toBN(info)
  }

  async getDelegatorStakeForServiceProvider(
    delegator: string,
    serviceProvider: string
  ) {
    const method = await this.getMethod(
      'getDelegatorStakeForServiceProvider',
      delegator,
      serviceProvider
    )
    const info = await method.call()
    return Utils.toBN(info)
  }

  async getPendingUndelegateRequest(delegator: string) {
    const method = await this.getMethod(
      'getPendingUndelegateRequest',
      delegator
    )
    const info = await method.call()
    return {
      amount: Utils.toBN(info.amount),
      lockupExpiryBlock: parseInt(info.lockupExpiryBlock),
      target: info.target
    }
  }

  async getPendingRemoveDelegatorRequest(
    serviceProvider: string,
    delegator: string
  ) {
    const method = await this.getMethod(
      'getPendingRemoveDelegatorRequest',
      serviceProvider,
      delegator
    )
    const info = await method.call()
    return { lockupExpiryBlock: parseInt(info) }
  }

  async getUndelegateLockupDuration() {
    const method = await this.getMethod('getUndelegateLockupDuration')
    const info = await method.call()
    return parseInt(info)
  }

  async getMaxDelegators() {
    const method = await this.getMethod('getMaxDelegators')
    const info = await method.call()
    return parseInt(info)
  }

  async getMinDelegationAmount() {
    const method = await this.getMethod('getMinDelegationAmount')
    const info = await method.call()
    return Utils.toBN(info)
  }

  async getRemoveDelegatorLockupDuration() {
    const method = await this.getMethod('getRemoveDelegatorLockupDuration')
    const info = await method.call()
    return parseInt(info)
  }

  async getRemoveDelegatorEvalDuration() {
    const method = await this.getMethod('getRemoveDelegatorEvalDuration')
    const info = await method.call()
    return parseInt(info)
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

  async getClaimsManagerAddress() {
    const method = await this.getMethod('getClaimsManagerAddress')
    const info = await method.call()
    return info
  }

  async getStakingAddress() {
    const method = await this.getMethod('getStakingAddress')
    const info = await method.call()
    return info
  }

  async getSPMinDelegationAmount({
    serviceProvider
  }: {
    serviceProvider: string
  }) {
    const method = await this.getMethod(
      'getSPMinDelegationAmount',
      serviceProvider
    )
    const info = await method.call()
    return Utils.toBN(info)
  }

  async updateSPMinDelegationAmount({
    serviceProvider,
    amount
  }: {
    serviceProvider: string
    amount: BN
  }) {
    const method = await this.getMethod(
      'updateSPMinDelegationAmount',
      serviceProvider,
      amount
    )
    return await this.web3Manager.sendTransaction(method)
  }

  async updateRemoveDelegatorLockupDuration(duration: string) {
    const method = await this.getGovernedMethod(
      'updateRemoveDelegatorLockupDuration',
      duration
    )
    return await this.web3Manager.sendTransaction(method)
  }

  async updateUndelegateLockupDuration(duration: string) {
    const method = await this.getGovernedMethod(
      'updateUndelegateLockupDuration',
      duration
    )
    return await this.web3Manager.sendTransaction(method)
  }
}
