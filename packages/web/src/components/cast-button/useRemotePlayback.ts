import { useCallback, useEffect, useState } from 'react'

import { castActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { audioPlayer } from 'services/audio-player'

const { setIsCasting } = castActions

type RemotePlaybackState =
  | 'disabled'
  | 'disconnected'
  | 'connecting'
  | 'connected'

type WebKitAudio = HTMLAudioElement & {
  webkitShowPlaybackTargetPicker?: () => void
  webkitCurrentPlaybackTargetIsWireless?: boolean
}

// Safari's AirPlay availability event isn't in lib.dom; it carries an
// `availability` field that is 'available' when a target is on the network.
type AirplayAvailabilityEvent = Event & {
  availability?: 'available' | 'not-available'
}

const getAudio = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null
  return audioPlayer?.audio ?? window.audio ?? null
}

const getRemote = (): RemotePlayback | null => {
  return getAudio()?.remote ?? null
}

export const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

const hasWebkitAirplay = (el: HTMLAudioElement | null): boolean => {
  const audio = el as WebKitAudio | null
  return !!audio && typeof audio.webkitShowPlaybackTargetPicker === 'function'
}

/**
 * Bridges the browser's wireless-playback APIs to Redux and exposes a
 * `prompt` action that opens the system picker.
 *
 * Safari implements AirPlay via webkit-prefixed APIs on HTMLMediaElement,
 * not via `RemotePlayback.prompt()`. We detect Safari and route through
 * `webkitShowPlaybackTargetPicker()` + the `webkitcurrentplaybacktarget-
 * iswirelesschanged` event, which is what actually drives AirPlay in
 * Safari. Chromium uses the standard `RemotePlayback` API to open
 * Chrome's cast picker.
 */
export const useRemotePlayback = () => {
  const dispatch = useDispatch()
  const safari = isSafari()
  const [state, setState] = useState<RemotePlaybackState>(() => {
    if (safari) {
      const audio = getAudio() as WebKitAudio | null
      return audio?.webkitCurrentPlaybackTargetIsWireless
        ? 'connected'
        : 'disconnected'
    }
    const remote = getRemote()
    return (remote?.state as RemotePlaybackState) ?? 'disabled'
  })
  const [supported, setSupported] = useState<boolean>(() => {
    if (safari) return hasWebkitAirplay(getAudio())
    const remote = getRemote()
    return !!remote && typeof remote.prompt === 'function'
  })
  // Whether a wireless playback target (Cast/AirPlay device) is actually
  // reachable on the network right now. Used to hide the device row when
  // there's nothing to connect to.
  const [available, setAvailable] = useState<boolean>(false)

  useEffect(() => {
    if (safari) {
      const attach = (): (() => void) | undefined => {
        const audio = getAudio() as WebKitAudio | null
        setSupported(hasWebkitAirplay(audio))
        if (!audio) return undefined
        const sync = () => {
          setState(
            audio.webkitCurrentPlaybackTargetIsWireless
              ? 'connected'
              : 'disconnected'
          )
        }
        sync()
        audio.addEventListener(
          'webkitcurrentplaybacktargetiswirelesschanged',
          sync
        )
        return () => {
          audio.removeEventListener(
            'webkitcurrentplaybacktargetiswirelesschanged',
            sync
          )
        }
      }
      // The audio element is created lazily by AudioPlayer; retry on the
      // next tick if it isn't there yet.
      let cleanup = attach()
      if (!cleanup) {
        const t = setTimeout(() => {
          cleanup = attach()
        }, 0)
        return () => {
          clearTimeout(t)
          cleanup?.()
        }
      }
      return cleanup
    }

    let remote = getRemote()
    if (!remote) {
      const t = setTimeout(() => {
        remote = getRemote()
        setSupported(!!remote && typeof remote?.prompt === 'function')
        if (remote) setState(remote.state as RemotePlaybackState)
      }, 0)
      return () => clearTimeout(t)
    }
    const sync = () => setState(remote!.state as RemotePlaybackState)
    sync()
    remote.addEventListener('connect', sync)
    remote.addEventListener('connecting', sync)
    remote.addEventListener('disconnect', sync)
    return () => {
      remote!.removeEventListener('connect', sync)
      remote!.removeEventListener('connecting', sync)
      remote!.removeEventListener('disconnect', sync)
    }
  }, [safari])

  // Track whether any wireless target is available on the network.
  useEffect(() => {
    if (safari) {
      const attach = (): (() => void) | undefined => {
        const audio = getAudio()
        if (!audio) return undefined
        const onAvailability = (e: Event) => {
          setAvailable(
            (e as AirplayAvailabilityEvent).availability === 'available'
          )
        }
        // Safari fires this on registration with the current availability and
        // again whenever a target appears/disappears.
        audio.addEventListener(
          'webkitplaybacktargetavailabilitychanged',
          onAvailability
        )
        return () =>
          audio.removeEventListener(
            'webkitplaybacktargetavailabilitychanged',
            onAvailability
          )
      }
      // The audio element is created lazily; retry on the next tick if needed.
      let cleanup = attach()
      if (!cleanup) {
        const t = setTimeout(() => {
          cleanup = attach()
        }, 0)
        return () => {
          clearTimeout(t)
          cleanup?.()
        }
      }
      return cleanup
    }

    let cancelled = false
    let callbackId: number | null = null
    const attach = () => {
      const remote = getRemote()
      if (!remote || typeof remote.watchAvailability !== 'function') {
        // Can't query availability on this platform — assume a device may be
        // present so we never hide a working cast flow.
        setAvailable(true)
        return
      }
      remote
        .watchAvailability((isAvailable) => setAvailable(isAvailable))
        .then((id) => {
          if (cancelled) remote.cancelWatchAvailability(id)
          else callbackId = id
        })
        .catch(() => {
          // Monitoring unsupported (spec: rejects with NotSupportedError) —
          // assume available rather than hiding the device row.
          setAvailable(true)
        })
    }
    let timer: ReturnType<typeof setTimeout> | null = null
    if (!getRemote()) timer = setTimeout(attach, 0)
    else attach()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      const remote = getRemote()
      if (remote && callbackId != null) {
        remote.cancelWatchAvailability(callbackId)
      }
    }
  }, [safari])

  useEffect(() => {
    dispatch(setIsCasting({ isCasting: state === 'connected' }))
  }, [state, dispatch])

  const prompt = useCallback(async () => {
    if (safari) {
      const audio = getAudio() as WebKitAudio | null
      // webkitShowPlaybackTargetPicker isn't async and doesn't return a
      // promise. It must be called in direct response to a user gesture —
      // the popup row click qualifies.
      audio?.webkitShowPlaybackTargetPicker?.()
      return
    }
    const remote = getRemote()
    if (!remote) return
    try {
      await remote.prompt()
    } catch {
      // User dismissed the picker or no devices — the picker handles its
      // own error UI; nothing to do here.
    }
  }, [safari])

  return { state, supported, available, prompt }
}
