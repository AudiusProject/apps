import { useEffect, useState } from 'react'

import { NativeEventEmitter, NativeModules, Platform } from 'react-native'

export type HingeStatus = 'unknown' | 'closed' | 'partiallyOpen' | 'fullyOpen'

export type HingeState = {
  available: boolean
  status?: HingeStatus
  angle?: number
}

const UNAVAILABLE: HingeState = { available: false }

const HingeModule =
  Platform.OS === 'ios' ? NativeModules.AudiusHinge : undefined
const emitter = HingeModule ? new NativeEventEmitter(HingeModule) : null

export const useHinge = () => {
  const [hinge, setHinge] = useState<HingeState>(UNAVAILABLE)

  useEffect(() => {
    if (!HingeModule || !emitter) return
    let cancelled = false
    HingeModule.getState?.().then((state: HingeState) => {
      if (!cancelled) setHinge(state)
    })
    const subscription = emitter.addListener(
      'hingeChanged',
      (state: HingeState) => setHinge(state)
    )
    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [])

  return hinge
}
