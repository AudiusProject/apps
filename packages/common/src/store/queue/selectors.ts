import { createSelector } from 'reselect'

import { UID } from '../../models'
import { Uid } from '../../utils/uid'
import { PlayerBehavior, playerSelectors } from '../player'
import { CommonState } from '../reducers'

const { getUid: getPlayerUid } = playerSelectors

export const getOrder = (state: CommonState) => state.queue.order
export const getLength = (state: CommonState) => state.queue.order.length
export const getOvershot = (state: CommonState) => state.queue.overshot
export const getUndershot = (state: CommonState) => state.queue.undershot
export const getPositions = (state: CommonState) => state.queue.positions
export const getIndex = (state: CommonState) => state.queue.index
export const getRepeat = (state: CommonState) => state.queue.repeat
export const getShuffle = (state: CommonState) => state.queue.shuffle
export const getShuffleIndex = (state: CommonState) => state.queue.shuffleIndex
export const getShuffleOrder = (state: CommonState) => state.queue.shuffleOrder
export const getUidInQueue = (state: CommonState, props: { uid: UID }) =>
  props.uid in getPositions(state)

const isQueueIndexValid = (state: CommonState) =>
  state.queue.index >= 0 &&
  state.queue.order.length > 0 &&
  state.queue.index < state.queue.order.length

export const getUid = (state: CommonState) =>
  isQueueIndexValid(state) ? state.queue.order[state.queue.index].uid : null
export const getSource = (state: CommonState) =>
  isQueueIndexValid(state) ? state.queue.order[state.queue.index].source : null
export const getId = (state: CommonState) =>
  isQueueIndexValid(state) ? state.queue.order[state.queue.index].id : null
export const getPlayerBehavior = (state: CommonState) =>
  isQueueIndexValid(state)
    ? (state.queue.order[state.queue.index].playerBehavior ??
      PlayerBehavior.FULL_OR_PREVIEW)
    : PlayerBehavior.FULL_OR_PREVIEW
export const getCollectionId = (state: CommonState) => {
  const uid = getUid(state)
  if (!uid) return null
  return Uid.getCollectionId(uid)
}

export const makeGetCurrent = () => {
  return createSelector([getPlayerUid, getSource], (uid, source) => ({
    uid,
    source
  }))
}
