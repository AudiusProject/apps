import BN from 'bn.js'

import { GetClaimProcessedResponse } from 'services/Audius/claim/types'
import {
  GetIncreaseDelegateStakeEventsResponse,
  GetClaimEventsResponse,
  GetDelegatorRemovedEventsResponse,
  GetSlashEventsResponse
} from 'services/Audius/delegate/types'
import {
  GetRegisteredServiceProviderEventsResponse,
  GetDeregisteredServiceProviderEventsResponse,
  GetIncreasedStakeEventResponse
} from 'services/Audius/service-provider/types'
import { Address, ProposalEvent, VoteEvent } from 'types'

export type ServiceProviderRegisteredEvent =
  GetRegisteredServiceProviderEventsResponse & {
    _type: 'ServiceProviderRegistered'
  }

export type ServiceProviderDeregisteredEvent =
  GetDeregisteredServiceProviderEventsResponse & {
    _type: 'ServiceProviderDeregistered'
  }

export type ServiceProviderIncreaseStakeEvent =
  GetIncreasedStakeEventResponse & {
    _type: 'ServiceProviderIncreaseStake'
  }

export type ServiceProviderDecreaseStakeEvent = {
  _type: 'ServiceProviderDecreaseStake'
  blockNumber: number
  owner: Address
  decreaseAmount: BN
  data:
    | {
        lockupExpiryBlock: number
        _type: 'Requested'
      }
    | {
        lockupExpiryBlock: number
        _type: 'Cancelled'
      }
    | {
        newStakeAmount: BN
        _type: 'Evaluated'
      }
}

export type DelegateIncreaseStakeEvent =
  GetIncreaseDelegateStakeEventsResponse & {
    _type: 'DelegateIncreaseStake'
    direction: 'Received' | 'Sent'
  }

export type DelegateDecreaseStakeEvent = {
  _type: 'DelegateDecreaseStake'
  direction: 'Received' | 'Sent'
  blockNumber: number
  delegator: Address
  amount: BN
  serviceProvider: Address
  data:
    | {
        _type: 'Requested'
        lockupExpiryBlock: number
      }
    | {
        _type: 'Evaluated'
      }
    | {
        _type: 'Cancelled'
      }
}

export type DelegateClaimEvent = GetClaimEventsResponse & {
  _type: 'DelegateClaim'
}

export type DelegateSlashEvent = GetSlashEventsResponse & {
  _type: 'DelegateSlash'
}

export type DelegateRemovedEvent = GetDelegatorRemovedEventsResponse & {
  _type: 'DelegateRemoved'
}

export type GovernanceVoteEvent = VoteEvent & {
  _type: 'GovernanceVote'
}

export type GovernanceVoteUpdateEvent = VoteEvent & {
  _type: 'GovernanceVoteUpdate'
}

export type GovernanceProposalEvent = ProposalEvent & {
  _type: 'GovernanceProposal'
}

export type ClaimProcessedEvent = GetClaimProcessedResponse & {
  _type: 'ClaimProcessed'
}

export type TimelineEvent =
  | ServiceProviderRegisteredEvent
  | ServiceProviderDeregisteredEvent
  | ServiceProviderIncreaseStakeEvent
  | ServiceProviderDecreaseStakeEvent
  | DelegateIncreaseStakeEvent
  | DelegateDecreaseStakeEvent
  | DelegateClaimEvent
  | DelegateSlashEvent
  | DelegateRemovedEvent
  | GovernanceVoteEvent
  | GovernanceVoteUpdateEvent
  | GovernanceProposalEvent
  | ClaimProcessedEvent
