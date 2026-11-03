import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStemPreview } from './useStemPreview'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  isQueuePlaying: false,
  getTrackStreamUrl: vi.fn(),
  signGatedContentRequest: vi.fn()
}))

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => mocks.isQueuePlaying
}))

vi.mock('@audius/common/api', () => ({
  useCurrentUserId: () => ({ data: 7 })
}))

vi.mock('services/audio-player', () => ({
  audioPlayer: { audio: { volume: 0.5 } }
}))

vi.mock('services/audius-backend/audius-backend-instance', () => ({
  audiusBackendInstance: {
    signGatedContentRequest: mocks.signGatedContentRequest
  }
}))

vi.mock('services/audius-sdk', () => ({
  audiusSdk: async () => ({
    tracks: { getTrackStreamUrl: mocks.getTrackStreamUrl }
  })
}))

class FakeAudio {
  static instances: FakeAudio[] = []
  src: string
  volume = 1
  onended: (() => void) | null = null
  play = vi.fn(async () => {})
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn()
  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
}

describe('useStemPreview', () => {
  beforeEach(() => {
    FakeAudio.instances = []
    vi.stubGlobal('Audio', FakeAudio)
    mocks.isQueuePlaying = false
    mocks.dispatch.mockReset()
    mocks.signGatedContentRequest.mockResolvedValue({
      data: 'data',
      signature: 'sig'
    })
    mocks.getTrackStreamUrl.mockImplementation(
      async ({ trackId }: { trackId: string }) => `https://stream/${trackId}`
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('plays a stem without counting a play', async () => {
    const { result } = renderHook(() => useStemPreview())

    await act(async () => {
      result.current.togglePreview(11)
    })

    await waitFor(() => expect(result.current.playingTrackId).toBe(11))
    expect(mocks.getTrackStreamUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        skipPlayCount: true,
        userSignature: 'sig',
        userData: 'data'
      })
    )
    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0].volume).toBe(0.5)
    expect(FakeAudio.instances[0].play).toHaveBeenCalled()
  })

  it('stops the preview when toggled again', async () => {
    const { result } = renderHook(() => useStemPreview())

    await act(async () => {
      result.current.togglePreview(11)
    })
    await waitFor(() => expect(result.current.playingTrackId).toBe(11))

    act(() => {
      result.current.togglePreview(11)
    })

    expect(result.current.playingTrackId).toBeNull()
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled()
  })

  it('switches to another stem, stopping the first', async () => {
    const { result } = renderHook(() => useStemPreview())

    await act(async () => {
      result.current.togglePreview(11)
    })
    await waitFor(() => expect(result.current.playingTrackId).toBe(11))

    await act(async () => {
      result.current.togglePreview(12)
    })

    await waitFor(() => expect(result.current.playingTrackId).toBe(12))
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled()
    expect(FakeAudio.instances).toHaveLength(2)
  })

  it('pauses the main player before previewing', async () => {
    mocks.isQueuePlaying = true
    const { result } = renderHook(() => useStemPreview())

    await act(async () => {
      result.current.togglePreview(11)
    })

    expect(mocks.dispatch).toHaveBeenCalledTimes(1)
  })

  it('resets state when the stream url lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getTrackStreamUrl.mockRejectedValueOnce(new Error('nope'))
    const { result } = renderHook(() => useStemPreview())

    await act(async () => {
      result.current.togglePreview(11)
    })

    await waitFor(() => expect(result.current.loadingTrackId).toBeNull())
    expect(result.current.playingTrackId).toBeNull()
    expect(FakeAudio.instances).toHaveLength(0)
  })
})
