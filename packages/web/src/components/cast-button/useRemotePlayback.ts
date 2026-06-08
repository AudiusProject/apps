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

  return { state, supported, prompt }
}
