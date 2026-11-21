import { useCallback, useEffect, useRef, useState } from 'react'

import { recordPlay, recordPause } from '../analytics/analytics'
import { sendPostMessage } from '../api/util'
import { AudioPlayer } from '../audio/AudioPlayer'
import { PlayingState } from '../components/playbutton/PlayButton'
import { decodeHashId } from '../util/hashIds'

const SEEK_INTERVAL = 200

const usePlayback = (id, onAfterAudioEnd) => {
  const [timing, setTiming] = useState({ position: 0, duration: 0 })
  const seekInterval = useRef(null)
  const [playCounter, setPlayCounter] = useState(0)
  const [prevPlayCounter, setPrevPlayCounter] = useState(0)
  const [mediaKey, setMediaKey] = useState(0)
  const playingStateRef = useRef(PlayingState.Stopped)

  const audioRef = useRef(null)
  const initAudio = () => {
    audioRef.current = new AudioPlayer()
  }
  const [, setRerenderBool] = useState(true)
  const setPlayingStateRef = useCallback((state) => {
    setRerenderBool((b) => !b)
    playingStateRef.current = state
  }, [])

  const togglePlayRef = useRef(() => {})
  const loadRef = useRef(() => {})
  const stopRef = useRef(() => {})
  const setVolumeRef = useRef(() => {})

  const onAfterAudioEndRef = useRef(onAfterAudioEnd)
  const onAfterAudioEndCallback = () => {
    onAfterAudioEndRef.current({
      stop: stopRef.current,
      onTogglePlay: togglePlayRef.current,
      load: loadRef.current,
      setVolume: setVolumeRef.current
    })
    sendPostMessage({ event: 'finish' })
  }

  useEffect(() => {
    onAfterAudioEndRef.current = onAfterAudioEnd
  }, [onAfterAudioEndRef, onAfterAudioEnd])

  const onAudioEnd = () => {
    if (!audioRef.current) {
      throw new Error('Init not called')
    }
    setPlayingStateRef(PlayingState.Stopped)
    clearInterval(seekInterval.current)
    setTiming({ position: 0, duration: audioRef.current.getDuration() })
    setMediaKey((m) => m + 1)
    onAfterAudioEndCallback()
  }

  const loadTrack = useCallback(
    ({ mp3StreamUrl }) => {
      if (!audioRef.current) {
        throw new Error('Init not called')
      }
      audioRef.current.load(0, onAudioEnd, mp3StreamUrl)
      const newTiming = {
        position: 0,
        duration: audioRef.current.getDuration()
      }
      setTiming(newTiming)
      sendPostMessage({ event: 'ready' })
      sendPostMessage({ event: 'progress', data: newTiming })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audioRef, setTiming, id]
  )
  loadRef.current = loadTrack

  const startSeeking = useCallback(() => {
    clearInterval(seekInterval.current)

    seekInterval.current = setInterval(async () => {
      const audio = audioRef.current
      if (!audio) {
        return
      }
      const position = audio.getPosition()
      const duration = audio.getDuration()
      const newTiming = { position, duration }
      setTiming(newTiming)
      if (playingStateRef.current === PlayingState.Playing) {
        sendPostMessage({ event: 'progress', data: newTiming })
      }
      const isBuffering = audio.isBuffering()
      if (isBuffering && playingStateRef.current !== PlayingState.Buffering) {
        playingStateRef.current = PlayingState.Buffering
        setRerenderBool((r) => !r)
      } else if (
        !isBuffering &&
        playingStateRef.current === PlayingState.Buffering
      ) {
        playingStateRef.current = PlayingState.Playing
        setRerenderBool((r) => !r)
      }
    }, SEEK_INTERVAL)
  }, [audioRef, setTiming])

  useEffect(() => {
    return () => {
      if (seekInterval.current) {
        clearInterval(seekInterval.current)
      }
    }
  }, [seekInterval])

  useEffect(() => {
    if (playCounter !== prevPlayCounter) {
      setPrevPlayCounter(playCounter)
      setMediaKey((m) => m + 1)
      startSeeking()
    }
  }, [
    playCounter,
    prevPlayCounter,
    startSeeking,
    timing,
    setTiming,
    setMediaKey
  ])

  const seekTo = useCallback((location) => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    audio.seek(location)
    sendPostMessage({ event: 'seek' })
  }, [])

  const onTogglePlay = useCallback(
    (idOverride) => {
      switch (playingStateRef.current) {
        case PlayingState.Stopped:
          setPlayingStateRef(PlayingState.Playing)
          audioRef.current?.play()
          setPlayCounter((p) => p + 1)
          recordPlay(decodeHashId(idOverride || id))
          sendPostMessage({ event: 'play' })
          break
        case PlayingState.Buffering:
          break
        case PlayingState.Paused:
          setPlayingStateRef(PlayingState.Playing)
          audioRef.current?.play()
          recordPlay(decodeHashId(idOverride || id))
          sendPostMessage({ event: 'play' })
          break
        case PlayingState.Playing:
          setPlayingStateRef(PlayingState.Paused)
          audioRef.current?.pause()
          recordPause(decodeHashId(idOverride || id))
          sendPostMessage({ event: 'pause' })
          break
      }
    },
    [playingStateRef, setPlayingStateRef, id]
  )
  togglePlayRef.current = onTogglePlay

  const stop = useCallback(() => {
    audioRef.current?.stop()
    setPlayingStateRef(PlayingState.Stopped)

    setTiming((t) => ({ position: 0, duration: t.duration }))
  }, [audioRef, setTiming, setPlayingStateRef])

  stopRef.current = stop

  const setVolume = useCallback(
    (volume) => {
      audioRef.current?.setVolume(volume)
    },
    [audioRef]
  )

  setVolumeRef.current = setVolume

  return {
    initAudio,
    playingState: playingStateRef.current,
    duration: timing.duration,
    position: timing.position,
    loadTrack,
    mediaKey,
    seekTo,
    onTogglePlay,
    stop,
    setVolume,
    audioPlayer: audioRef
  }
}

export default usePlayback
