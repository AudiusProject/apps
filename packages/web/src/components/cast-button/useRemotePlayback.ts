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

const getRemote = (): RemotePlayback | null => {
  if (typeof window === 'undefined') return null
  const el = audioPlayer?.audio ?? window.audio
  return el?.remote ?? null
}

/**
 * Bridges the browser's RemotePlayback API to Redux + exposes a `prompt`
 * action that opens Chrome's native cast picker.
 */
export const useRemotePlayback = () => {
  const dispatch = useDispatch()
  const [state, setState] = useState<RemotePlaybackState>(() => {
    const remote = getRemote()
    return (remote?.state as RemotePlaybackState) ?? 'disabled'
  })
  const [supported, setSupported] = useState<boolean>(() => {
    const remote = getRemote()
    return !!remote && typeof remote.prompt === 'function'
  })

  useEffect(() => {
    let remote = getRemote()
    if (!remote) {
      // The HTMLAudioElement is recreated on each load. Re-resolve after a
      // tick if it wasn't available yet.
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
  }, [])

  useEffect(() => {
    dispatch(setIsCasting({ isCasting: state === 'connected' }))
  }, [state, dispatch])

  const prompt = useCallback(async () => {
    const remote = getRemote()
    if (!remote) return
    try {
      await remote.prompt()
    } catch {
      // User dismissed picker or no devices — silent, the picker handles its
      // own error UI.
    }
  }, [])

  return { state, supported, prompt }
}
