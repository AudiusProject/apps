import { useCallback, useEffect, useRef } from 'react'

import { castActions } from '@audius/common/store'
import type { EmitterSubscription } from 'react-native'
import {
  requireNativeComponent,
  NativeEventEmitter,
  NativeModules
} from 'react-native'
import { useDispatch } from 'react-redux'

const { setIsCasting } = castActions
const AIRPLAY_PORT_TYPE = 'AirPlay'

const AirplayViewManager = requireNativeComponent('AirplayView')
const { AirplayEvent } = NativeModules
const airplayEventListener = new NativeEventEmitter(AirplayEvent)

export const useAirplay = () => {
  const openAirplayDialog = useCallback(() => {
    const airplay = NativeModules.AirplayViewManager
    airplay.click()
  }, [])
  return { openAirplayDialog }
}

const Airplay = () => {
  const listenerRef = useRef<EmitterSubscription | null>(null)
  const dispatch = useDispatch()

  useEffect(() => {
    AirplayEvent.startScan()
    listenerRef.current = airplayEventListener.addListener(
      'deviceConnected',
      (device) => {
        console.info(`Connected to device ${JSON.stringify(device)}`)
        const route = device?.devices?.[0]
        if (route?.portType === AIRPLAY_PORT_TYPE) {
          dispatch(
            setIsCasting({
              isCasting: true,
              method: 'airplay',
              deviceName: route.portName ?? route.name ?? null
            })
          )
        } else {
          dispatch(setIsCasting({ isCasting: false, method: 'airplay' }))
        }
      }
    )

    return () => {
      listenerRef.current?.remove()
    }
  }, [listenerRef, dispatch])

  return <AirplayViewManager />
}

export default Airplay
