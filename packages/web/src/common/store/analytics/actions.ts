import { useCallback } from 'react'

import { Name, AllTrackingEvents, IdentifyTraits } from '@audius/common/models'
import { useDispatch as useDispatchRedux } from 'react-redux'

export const IDENTIFY = 'ANALYTICS/IDENTIFY'
export const TRACK = 'ANALYTICS/TRACK'

export const identify = (traits?: IdentifyTraits) => ({
  type: IDENTIFY,
  traits
})

export type IdentifyEvent = {
  type: typeof IDENTIFY
  traits: Record<string, any>
}

export type TrackEvent = AllTrackingEvents & {
  type: typeof TRACK
  callback?: () => void
  options?: Record<string, any>
}

export const make = <U extends Name, T>(
  eventName: U,
  m: T
): {
  eventName: U
  type: typeof TRACK
} & T => ({
  type: TRACK,
  eventName,
  ...m
})

export const useRecord = () => {
  const dispatch = useDispatchRedux()
  const record = useCallback(
    (action: TrackEvent) => dispatch(action),
    [dispatch]
  )
  return record
}
