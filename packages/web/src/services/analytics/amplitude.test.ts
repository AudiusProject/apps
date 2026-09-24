import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => {
  let sessionId = 1
  const identify = vi.fn()
  return {
    init: vi.fn(() => ({ promise: Promise.resolve() })),
    add: vi.fn(),
    track: vi.fn(),
    setUserId: vi.fn(),
    identify,
    getSessionId: vi.fn(() => sessionId),
    setSessionId: (id: number) => {
      sessionId = id
    },
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
    sdk.setSessionId(1)
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

  it('tracks Session Start once per Amplitude session', async () => {
    await (await loadAmplitude()).init(false)
    await (await loadAmplitude()).init(false)
    expect(sdk.track).toHaveBeenCalledTimes(1)

    sdk.setSessionId(2)
    await (await loadAmplitude()).init(false)
    expect(sdk.track).toHaveBeenCalledTimes(2)
  })

  it('skips identify when traits are unchanged', async () => {
    const amplitude = await loadAmplitude()
    const traits = { handle: 'someone', userId: 1, isVerified: false }

    await amplitude.identify(traits)
    await amplitude.identify({ ...traits })
    expect(sdk.identify).toHaveBeenCalledTimes(1)
    expect(sdk.setUserId).toHaveBeenCalledTimes(2)

    await amplitude.identify({ ...traits, isVerified: true })
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
