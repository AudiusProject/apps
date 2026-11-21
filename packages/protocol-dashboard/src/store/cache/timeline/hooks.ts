import { useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import { TimelineEvent } from 'models/TimelineEvents'
import Audius from 'services/Audius'
import { useUsers } from 'store/cache/user/hooks'
import { AppState } from 'store/types'
import { Address } from 'types'

import { useDispatchBasedOnBlockNumber } from '../protocol/hooks'

import { setTimeline } from './slice'

const getFirstEvent = (...events: TimelineEvent[]) => {
  let min = Number.MAX_SAFE_INTEGER
  let firstEvent = null
  let index = 0
  for (let i = 0; i < events.length; ++i) {
    const e = events[i]
    if (e && e.blockNumber < min) {
      min = e.blockNumber
      firstEvent = e
      index = i
    }
  }
  return { firstEvent: firstEvent as TimelineEvent, index }
}

const combineEvents = (...eventLists: TimelineEvent[][]) => {
  const combined: TimelineEvent[] = []
  let i = 0
  const combinedLength = eventLists.reduce((acc, cur) => acc + cur.length, 0)
  while (i < combinedLength) {
    const heads = eventLists.map((l) => l[0])
    const { firstEvent, index } = getFirstEvent(...heads)
    combined.push(firstEvent)
    eventLists[index].shift()
    i += 1
  }
  return combined
}

export const getTimeline = (state: AppState, { wallet }: { wallet: Address }) =>
  state.cache.timeline.timelines[wallet]

export type TimelineType = 'ServiceProvider' | 'Delegator'

export function fetchTimeline(
  wallet: Address,
  timelineType: TimelineType
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, _, aud) => {
    const filter =
      timelineType === 'Delegator'
        ? { delegator: wallet }
        : { serviceProvider: wallet }

    const rawEvents: Promise<TimelineEvent[]>[] = [
      aud.Governance.getVoteEventsByAddress([wallet]),
      aud.Governance.getVoteUpdateEventsByAddress([wallet]),
      aud.Governance.getProposalsForAddresses([wallet]),
      aud.Claim.getClaimProcessedEvents(wallet),
      aud.ServiceProviderClient.getRegisteredServiceProviderEvents(wallet),
      aud.ServiceProviderClient.getDeregisteredServiceProviderEvents(wallet),
      aud.ServiceProviderClient.getIncreasedStakeEvents(wallet),
      aud.ServiceProviderClient.getDecreasedStakeRequestedEvents(wallet),
      aud.Delegate.getIncreaseDelegateStakeEvents(filter),
      aud.Delegate.getDecreaseDelegateStakeEvaluatedEvents(filter),
      aud.Delegate.getUndelegateStakeRequestedEvents(filter),
      aud.Delegate.getUndelegateStakeCancelledEvents(filter)
    ]
    const events = await Promise.all(rawEvents)

    const timeline = combineEvents(...events).reverse()

    dispatch(setTimeline({ wallet, timeline }))
  }
}

export const useTimeline = (wallet: Address, timelineType: TimelineType) => {
  const timeline = useSelector((state) =>
    getTimeline(state as AppState, { wallet })
  )
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useUsers()

  useEffect(() => {
    if (wallet && !timeline) {
      dispatch(fetchTimeline(wallet, timelineType))
    }
  }, [dispatch, wallet, timeline, timelineType])

  useDispatchBasedOnBlockNumber([fetchTimeline(wallet, timelineType)], 5)

  return { timeline }
}
