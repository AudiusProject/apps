import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => {
  const identify = vi.fn()
  return {
    init: vi.fn(() => ({ promise: Promise.resolve() })),
    add: vi.fn(),
    track: vi.fn(),
    setUserId: vi.fn(),
    identify,
    getDeviceId: vi.fn((): string | undefined => 'device'),
    Identify: class {
      set = vi.fn()
    }
  }
})

vi.mock('@amplitude/analytics-browser', () => sdk)
vi.mock('@amplitude/plugin-session-replay-browser', () => ({
  sessionReplayPlugin: vi.fn(() => ({}))
}))
vi.mock('services/env', () => ({
  env: { AMPLITUDE_API_KEY: 'key', AMPLITUDE_PROXY: 'https://proxy' }
}))

const loadAmplitude = async () => {
  vi.resetModules()
  return await import('./amplitude')
}

describe('amplitude', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    // The test DOM reports itself as automated
    vi.spyOn(window.navigator, 'webdriver', 'get').mockReturnValue(false)
  })

  it('turns off the automatic events', async () => {
    const amplitude = await loadAmplitude()
    await amplitude.init(false)

    expect(sdk.init).toHaveBeenCalledWith(
      'key',
      expect.objectContaining({
        defaultTracking: expect.objectContaining({
          pageViews: false,
          sessions: false,
          formInteractions: false,
          fileDownloads: false
        })
      })
    )
  })

  it('sets the client user property once per device', async () => {
    await (await loadAmplitude()).init(false)
    await (await loadAmplitude()).init(false)
    expect(sdk.identify).toHaveBeenCalledTimes(1)
    expect(sdk.track).not.toHaveBeenCalled()
  })

  it('always sends core events and samples the rest by device', async () => {
    const amplitude = await loadAmplitude()
    await amplitude.init(false)
    const { getAnalyticsSampleRate } = await import('@audius/common/models')

    await amplitude.track('Playback: Play', { id: 1 })
    expect(sdk.track).toHaveBeenLastCalledWith('Playback: Play', { id: 1 })

    const devices = Array.from({ length: 1000 }, (_, i) => `device-${i}`)
    const kept = devices.filter(
      (d) => getAnalyticsSampleRate('Play Queue: Open', d) !== null
    )
    expect(kept.length).toBeGreaterThan(60)
    expect(kept.length).toBeLessThan(140)

    sdk.getDeviceId.mockReturnValue(kept[0])
    await amplitude.track('Play Queue: Open', { id: 2 })
    expect(sdk.track).toHaveBeenLastCalledWith('Play Queue: Open', {
      id: 2,
      sampleRate: 0.1
    })

    const dropped = devices.find((d) => !kept.includes(d))
    sdk.getDeviceId.mockReturnValue(dropped!)
    sdk.track.mockClear()
    await amplitude.track('Play Queue: Open')
    expect(sdk.track).not.toHaveBeenCalled()
  })

  it('skips identify when traits are unchanged', async () => {
    const amplitude = await loadAmplitude()
    await amplitude.init(false)
    sdk.identify.mockClear()
    const traits = { handle: 'someone', userId: 1, name: 'Someone' }

    await amplitude.identify(traits)
    await amplitude.identify({ ...traits })
    expect(sdk.identify).toHaveBeenCalledTimes(1)
    expect(sdk.setUserId).toHaveBeenCalledTimes(2)

    await amplitude.identify({ ...traits, name: 'Someone Else' })
    expect(sdk.identify).toHaveBeenCalledTimes(2)
  })

  it('does nothing for bots', async () => {
    vi.spyOn(window.navigator, 'webdriver', 'get').mockReturnValue(true)
    const amplitude = await loadAmplitude()
    await amplitude.init(false)
    await amplitude.track('Playback: Play')

    expect(sdk.init).not.toHaveBeenCalled()
    expect(sdk.track).not.toHaveBeenCalled()
  })
})
