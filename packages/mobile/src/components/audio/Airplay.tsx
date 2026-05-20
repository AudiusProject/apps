import { useCallback, useEffect, useRef } from 'react'

import { castActions } from '@audius/common/store'
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

/**
 * An airplay component that talks to the native layer and
 * lets the user broadcast and receive information from
 * a native AVRoutePickerView.
 *
 * Unlike other casting (e.g. chromecast), the Airplay
 * interface requires a native component to be silently rendered.
 * There may be other ways to do this, but documentation
 * for a react-native bridge is quite sparse.
 * See the implementation of AirplayViewManager.m in the ios
 * codebase.
 */
const Airplay = () => {
  const listenerRef = useRef<any>(null)
  const dispatch = useDispatch()

  useEffect(() => {
    // On mount, we start scanning the network for airplay devices
    // and listen for changes to `deviceConnected`
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
          // Tag the disconnect with method:'airplay' so the reducer only
          // clears state if AirPlay was the active method. This prevents the
          // listener (which fires on any audio route change, including the
          // one Chromecast triggers when it takes over) from clobbering
          // chromecast state.
          dispatch(setIsCasting({ isCasting: false, method: 'airplay' }))
        }
      }
    )

    return () => {
      listenerRef.current?.stop?.()
    }
  }, [listenerRef, dispatch])

  return <AirplayViewManager />
}

export default Airplay
