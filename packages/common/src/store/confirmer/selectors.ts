import { findLastIndex } from 'lodash'

import { CommonState } from '~/store/commonStore'

export const getIsConfirming = (state: CommonState) =>
  Object.keys(state.confirmer.confirm).length > 0 || state.upload.uploading

export const getResult = (
  state: CommonState,
  props: { uid: number | string; index: number }
) => {
  if (!(props.uid in state.confirmer.confirm) || props.index < 0) {
    return {}
  }
  const calls = state.confirmer.confirm[props.uid].calls
  const resultIndex = findLastIndex(
    calls,
    (c) => c.cancelled !== true,
    props.index
  )
  return resultIndex === -1 ? {} : calls[resultIndex].result
}

export const getLatestResult = (
  state: CommonState,
  props: { uid: number | string }
) => {
  if (!(props.uid in state.confirmer.confirm)) {
    return {}
  }

  const calls = state.confirmer.confirm[props.uid].calls
  const lastCallResultIndex = findLastIndex(calls, (c) => c.result !== null)
  return lastCallResultIndex === -1 ? {} : calls[lastCallResultIndex].result
}

export const getShouldCancelCurrentCall = (
  state: CommonState,
  props: { uid: number | string }
) => {
  if (!(props.uid in state.confirmer.confirm)) {
    return undefined
  }
  const confirmGroup = state.confirmer.confirm[props.uid]
  const currentCall =
    confirmGroup.index < 0 || confirmGroup.index >= confirmGroup.calls.length
      ? null
      : confirmGroup.calls[confirmGroup.index]
  if (currentCall == null) {
    return undefined
  }
  const nextCall =
    confirmGroup.index + 1 >= confirmGroup.calls.length
      ? null
      : confirmGroup.calls[confirmGroup.index + 1]
  if (nextCall === null) {
    return false
  }
  if (
    currentCall.squashable &&
    nextCall.squashable &&
    currentCall.operationId === nextCall.operationId
  ) {
    return true
  }
  return false
}

export const getIndexEquals = (
  state: CommonState,
  props: { uid: number | string; index: number }
) =>
  props.uid in state.confirmer.confirm
    ? state.confirmer.confirm[props.uid].index === props.index
    : false

export const getConfirmLength = (
  state: CommonState,
  props: { uid: string | number }
): number =>
  props.uid in state.confirmer.confirm
    ? state.confirmer.confirm[props.uid].calls.length
    : 0

export const getAreRequisiteCallsComplete = (
  state: CommonState,
  props: {
    uid: string | number
    index: number
  }
) => {
  if (!(props.uid in state.confirmer.confirm) || props.index <= 0) {
    return true
  }
  const currentCall = state.confirmer.confirm[props.uid].calls[props.index]
  if (!currentCall) {
    return false
  }
  return state.confirmer.confirm[props.uid].calls
    .slice(0, props.index)
    .every(
      (call) =>
        call.result !== null ||
        call.cancelled === true ||
        (currentCall.parallelizable &&
          call.parallelizable &&
          currentCall.operationId === call.operationId)
    )
}

export const getIsDone = (
  state: CommonState,
  props: { uid: string | number }
) =>
  props.uid in state.confirmer.confirm
    ? state.confirmer.confirm[props.uid].calls.every(
        (call) => call.result !== null || call.cancelled === true
      )
    : true

export const getCommandChain = (
  state: CommonState,
  props: { uid: string | number }
) =>
  props.uid in state.confirmer.complete
    ? state.confirmer.complete[props.uid]
    : []

export const getConfirmCalls = (state: CommonState) => state.confirmer.confirm
