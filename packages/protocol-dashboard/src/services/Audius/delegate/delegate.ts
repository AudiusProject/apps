import BN from 'bn.js'

import {
  DelegateClaimEvent,
  DelegateDecreaseStakeEvent,
  DelegateIncreaseStakeEvent,
  DelegateRemovedEvent,
  DelegateSlashEvent
} from 'models/TimelineEvents'
import { Address, Amount, BlockNumber, TxReceipt, Permission } from 'types'

import { AudiusClient } from '../AudiusClient'

import {
  GetClaimEventsResponse,
  GetDelegatorRemovedEventsResponse,
  GetDelegatorsListResponse,
  GetSlashEventsResponse,
  GetDecreaseDelegateStakeCancelledEventsResponse,
  GetDecreaseDelegateStakeEvaluatedResponse,
  GetDecreaseDelegateStakeRequestedResponse,
  GetIncreaseDelegateStakeEventsResponse,
  GetPendingUndelegateRequestResponse,
  UndelegateStakeResponse,
  RemoveDelegatorResponse
} from './types'

export type DelegateStakeResponse = {
  txReceipt: TxReceipt
  tokenApproveReceipt: { txReceipt: TxReceipt }
  delegator: Address
  serviceProvider: Address
  increaseAmount: BN
}

export default class Delegate {
  aud: AudiusClient

  constructor(aud: AudiusClient) {
    this.aud = aud
  }

  getContract() {
    return this.aud.libs.ethContracts.DelegateManagerClient
  }

  async getDelegatorsList(
    serviceProvider: Address
  ): Promise<GetDelegatorsListResponse> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getDelegatorsList(serviceProvider)
    return info
  }

  async getTotalDelegatedToServiceProvider(
    serviceProvider: Address
  ): Promise<BN> {
    await this.aud.hasPermissions()
    const info =
      await this.getContract().getTotalDelegatedToServiceProvider(
        serviceProvider
      )
    return info
  }

  async getTotalDelegatorStake(delegator: Address): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getTotalDelegatorStake(delegator)
    return info
  }

  async getTotalLockedDelegationForServiceProvider(
    serviceProvider: Address
  ): Promise<BN> {
    await this.aud.hasPermissions()
    const info =
      await this.getContract().getTotalLockedDelegationForServiceProvider(
        serviceProvider
      )
    return info
  }

  async getDelegatorStakeForServiceProvider(
    delegator: Address,
    serviceProvider: Address
  ): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getDelegatorStakeForServiceProvider(
      delegator,
      serviceProvider
    )
    return info
  }

  async getPendingUndelegateRequest(
    delegator: Address
  ): Promise<GetPendingUndelegateRequestResponse> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getPendingUndelegateRequest(delegator)
    return info
  }

  async getPendingRemoveDelegatorRequest(
    serviceProvider: Address,
    delegator: Address
  ): Promise<{ lockupExpiryBlock: BlockNumber }> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getPendingRemoveDelegatorRequest(
      serviceProvider,
      delegator
    )
    return info
  }

  async getUndelegateLockupDuration(): Promise<BlockNumber> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getUndelegateLockupDuration()
    return info
  }

  async getMaxDelegators(): Promise<number> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getMaxDelegators()
    return info
  }

  async getMinDelegationAmount(): Promise<BN> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getMinDelegationAmount()
    return info
  }

  async getRemoveDelegatorLockupDuration(): Promise<BlockNumber> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getRemoveDelegatorLockupDuration()
    return info
  }

  async getRemoveDelegatorEvalDuration(): Promise<BlockNumber> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getRemoveDelegatorEvalDuration()
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

  async getClaimsManagerAddress(): Promise<Address> {
    await this.aud.hasPermissions()
    const info = await this.getContract().getClaimsManagerAddress()
    return info
  }

  async getIncreaseDelegateStakeEvents({
    delegator,
    serviceProvider
  }: {
    delegator?: Address
    serviceProvider?: Address
  }): Promise<DelegateIncreaseStakeEvent[]> {
    await this.aud.hasPermissions()
    const info: GetIncreaseDelegateStakeEventsResponse[] =
      await this.getContract().getIncreaseDelegateStakeEvents({
        delegator,
        serviceProvider
      })
    return info.map((event) => ({
      ...event,
      _type: 'DelegateIncreaseStake',
      direction: delegator ? 'Sent' : 'Received'
    }))
  }

  async getDecreaseDelegateStakeEvaluatedEvents({
    delegator,
    serviceProvider
  }: {
    delegator?: Address
    serviceProvider?: Address
  }): Promise<DelegateDecreaseStakeEvent[]> {
    await this.aud.hasPermissions()
    const info: GetDecreaseDelegateStakeEvaluatedResponse[] =
      await this.getContract().getDecreaseDelegateStakeEvents({
        delegator,
        serviceProvider
      })
    return info.map((event) => ({
      _type: 'DelegateDecreaseStake',
      direction: delegator ? 'Sent' : 'Received',
      blockNumber: event.blockNumber,
      delegator: event.delegator,
      amount: event.amount,
      serviceProvider: event.serviceProvider,
      data: {
        _type: 'Evaluated'
      }
    }))
  }

  async getUndelegateStakeRequestedEvents({
    serviceProvider,
    delegator
  }: {
    serviceProvider?: Address
    delegator?: Address
  }): Promise<DelegateDecreaseStakeEvent[]> {
    await this.aud.hasPermissions()
    const info: GetDecreaseDelegateStakeRequestedResponse[] =
      await this.getContract().getUndelegateStakeRequestedEvents({
        serviceProvider,
        delegator
      })
    return info.map((event) => ({
      _type: 'DelegateDecreaseStake',
      direction: delegator ? 'Sent' : 'Received',
      blockNumber: event.blockNumber,
      delegator: event.delegator,
      amount: event.amount,
      serviceProvider: event.serviceProvider,
      data: {
        _type: 'Requested',
        lockupExpiryBlock: event.lockupExpiryBlock
      }
    }))
  }

  async getUndelegateStakeCancelledEvents({
    serviceProvider,
    delegator
  }: {
    serviceProvider?: Address
    delegator?: Address
  }): Promise<DelegateDecreaseStakeEvent[]> {
    await this.aud.hasPermissions()
    const info: GetDecreaseDelegateStakeCancelledEventsResponse[] =
      await this.getContract().getUndelegateStakeCancelledEvents({
        serviceProvider,
        delegator
      })
    return info.map((event) => ({
      _type: 'DelegateDecreaseStake',
      direction: delegator ? 'Sent' : 'Received',
      blockNumber: event.blockNumber,
      delegator: event.delegator,
      amount: event.amount,
      serviceProvider: event.serviceProvider,
      data: {
        _type: 'Cancelled'
      }
    }))
  }

  async getClaimEvents(claimer: Address): Promise<DelegateClaimEvent[]> {
    await this.aud.hasPermissions()
    const info: GetClaimEventsResponse[] =
      await this.getContract().getClaimEvents({
        claimer
      })
    return info.map((event) => ({
      ...event,
      _type: 'DelegateClaim'
    }))
  }

  async getSlashEvents(target: Address): Promise<DelegateSlashEvent[]> {
    await this.aud.hasPermissions()
    const info: GetSlashEventsResponse[] =
      await this.getContract().getSlashEvents({
        target
      })
    return info.map((event) => ({
      ...event,
      _type: 'DelegateSlash'
    }))
  }

  async getDelegatorRemovedEvents(
    delegator: Address
  ): Promise<DelegateRemovedEvent[]> {
    await this.aud.hasPermissions()
    const info: GetDelegatorRemovedEventsResponse[] =
      await this.getContract().getDecreaseDelegateStakeEvents({
        delegator
      })
    return info.map((e) => ({
      ...e,
      _type: 'DelegateRemoved'
    }))
  }

  async getSPMinDelegationAmount(serviceProvider: Address): Promise<BN> {
    await this.aud.hasPermissions()
    const minDelegationAmount =
      await this.getContract().getSPMinDelegationAmount({ serviceProvider })
    return minDelegationAmount
  }

  async delegateStake(
    targetSP: Address,
    amount: Amount
  ): Promise<DelegateStakeResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().delegateStake(targetSP, amount)
    return info
  }

  async requestUndelegateStake(
    targetSP: Address,
    amount: Amount
  ): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().requestUndelegateStake(
      targetSP,
      amount
    )
    return info
  }

  async cancelUndelegateStakeRequest(): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().cancelUndelegateStakeRequest()
    return info
  }

  async undelegateStake(): Promise<UndelegateStakeResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().undelegateStake()
    return info
  }

  async claimRewards(serviceProvider: Address) {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().claimRewards(serviceProvider)
    return info
  }

  async requestRemoveDelegator(
    serviceProvider: Address,
    delegator: Address
  ): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().requestRemoveDelegator(
      serviceProvider,
      delegator
    )
    return info
  }

  async cancelRemoveDelegatorRequest(
    serviceProvider: Address,
    delegator: Address
  ): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().cancelRemoveDelegatorRequest(
      serviceProvider,
      delegator
    )
    return info
  }

  async removeDelegator(
    serviceProvider: Address,
    delegator: Address
  ): Promise<RemoveDelegatorResponse> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().removeDelegator(
      serviceProvider,
      delegator
    )
    return info
  }

  async updateSPMinDelegationAmount(
    serviceProvider: Address,
    amount: Amount
  ): Promise<TxReceipt> {
    await this.aud.hasPermissions(Permission.WRITE)
    const info = await this.getContract().updateSPMinDelegationAmount({
      serviceProvider,
      amount
    })
    return info
  }
}
