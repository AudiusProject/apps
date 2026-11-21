const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const IS_UI_WEBVIEW = /(iPhone|iPod|iPad).*AppleWebKit/i.test(
  navigator.userAgent
)

const FADE_IN_EVENT = new Event('fade-in')
const FADE_OUT_EVENT = new Event('fade-out')
const VOLUME_CHANGE_BASE = 10
const BUFFERING_DELAY_MILLISECONDS = 1000
const FADE_IN_TIME_MILLISECONDS = 320
const FADE_OUT_TIME_MILLISECONDS = 400

const IS_CHROME_LIKE =
  /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)

export let AudioError
;(function (AudioError) {
  AudioError.AUDIO = 'AUDIO'
})(AudioError || (AudioError = {}))

export class AudioPlayer {
  constructor() {
    this.audio = new Audio()
    window.audio = this.audio

    this.audioCtx = null
    this.source = null
    this.gainNode = null

    this.duration = 0

    this.playbackRate = '1x'

    this.bufferingTimeout = null
    this.buffering = false
    this.onBufferingChange = () => {}

    this.concatBufferInterval = null
    this.nextBufferIndex = 0
    this.loadCounter = 0

    this.recordListenedTime = 5
    this.endedListener = null
    this.waitingListener = null
    this.canPlayListener = null

    this.url = null

    this.onError = () => {}
  }

  load = (duration, onEnd, mp3Url = null) => {
    if (mp3Url) {
      this.stop()
      const prevVolume = this.audio.volume

      if (this.audio) {
        this.audio.removeAllListeners?.()

        this.audio.src = ''
        this.audio.remove()
      }

      if (this.bufferingTimeout) {
        clearTimeout(this.bufferingTimeout)
      }

      this.audio = new Audio()

      window.audio = this.audio

      this.gainNode = null
      this.source = null
      this.audioCtx = null

      this.audio.addEventListener('canplay', () => {
        if (!this.audioCtx && !IS_SAFARI && !IS_UI_WEBVIEW) {
          const AudioContext = window.AudioContext || window.webkitAudioContext
          try {
            this.audioCtx = new AudioContext()
            this.gainNode = this.audioCtx.createGain()
            this.source = this.audioCtx.createMediaElementSource(this.audio)
            this.source.connect(this.gainNode)
            this.gainNode.connect(this.audioCtx.destination)
          } catch (e) {
            console.error('error setting up audio context')
            console.error(e)
          }
        }

        if (this.bufferingTimeout) {
          clearTimeout(this.bufferingTimeout)
        }
        this.buffering = false
        this.onBufferingChange(this.buffering)
      })

      this.audio.onerror = (e) => {
        this.onError(AudioError.AUDIO, e)
      }
      this.audio.preload = 'none'
      this.audio.crossOrigin = 'anonymous'
      this.audio.src = mp3Url
      this.audio.volume = prevVolume
      this.audio.onloadedmetadata = () => (this.duration = this.audio.duration)
    }

    this.duration = duration

    if (this.endedListener) {
      this.audio.removeEventListener('ended', this.endedListener)
    }
    this.endedListener = () => {
      onEnd()
    }
    this.audio.addEventListener('ended', this.endedListener)

    if (this.waitingListener) {
      this.audio.removeEventListener('waiting', this.waitingListener)
    }
    this.waitingListener = () => {
      this.bufferingTimeout = setTimeout(() => {
        this.buffering = true
        this.onBufferingChange(this.buffering)
      }, BUFFERING_DELAY_MILLISECONDS)
    }
    this.audio.addEventListener('waiting', this.waitingListener)
  }

  play = () => {
    this.audio.removeEventListener('fade-out', this._pauseInternal)
    if (this.audio.currentTime !== 0) {
      this._fadeIn()
    } else if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(1, 0)
    }

    if (this.audioCtx && IS_CHROME_LIKE) {
      this.source.connect(this.gainNode)
    }

    this._updateAudioPlaybackRate()

    const promise = this.audio.play()
    if (promise) {
      promise.catch(() => {
        // Let pauses interrupt plays (as the user could be rapidly skipping through tracks).
      })
    }
  }

  pause = () => {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(1, this.audioCtx?.currentTime ?? 0)
    }
    this.audio.addEventListener('fade-out', this._pauseInternal)
    this._fadeOut()
  }

  _pauseInternal = () => {
    if (this.audioCtx && IS_CHROME_LIKE) {
      this.source.disconnect()
    }
    this.audio.pause()
  }

  stop = () => {
    this.audio.pause()
    this.audio.currentTime = 0
  }

  isPlaying = () => {
    return !this.audio.paused
  }

  isPaused = () => {
    return this.audio.paused
  }

  isBuffering = () => {
    return this.buffering
  }

  getDuration = () => {
    return this.duration
  }

  getPosition = () => {
    return this.audio.currentTime
  }

  getPlaybackRate = () => {
    return this.playbackRate
  }

  getAudioPlaybackRate = () => {
    return this.audio.playbackRate
  }

  seek = (seconds) => {
    if (isFinite(seconds)) {
      this.audio.currentTime = seconds
    }
  }

  setVolume = (value) => {
    this.audio.volume =
      (Math.pow(VOLUME_CHANGE_BASE, value) - 1) / (VOLUME_CHANGE_BASE - 1)
  }

  setPlaybackRate = (value) => {
    this.playbackRate = value
    this._updateAudioPlaybackRate()
  }

  _updateAudioPlaybackRate = () => {
    // NO-OP for embed player
    // this.audio.playbackRate = playbackRateValueMap[this.playbackRate]
  }

  _fadeIn = () => {
    if (this.gainNode) {
      setTimeout(() => {
        this.audio.dispatchEvent(FADE_IN_EVENT)
      }, FADE_IN_TIME_MILLISECONDS)
      this.gainNode.gain.exponentialRampToValueAtTime(
        1,
        this.audioCtx.currentTime + FADE_IN_TIME_MILLISECONDS / 1000.0
      )
    } else {
      this.audio.dispatchEvent(FADE_IN_EVENT)
    }
  }

  _fadeOut = () => {
    if (this.gainNode) {
      setTimeout(() => {
        this.audio.dispatchEvent(FADE_OUT_EVENT)
      }, FADE_OUT_TIME_MILLISECONDS)
      this.gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioCtx.currentTime + FADE_OUT_TIME_MILLISECONDS / 1000.0
      )
    } else {
      this.audio.dispatchEvent(FADE_OUT_EVENT)
    }
  }
}
