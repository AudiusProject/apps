import { Name, MobileOS, IdentifyTraits } from '@audius/common/models'

import { env } from 'services/env'
import { isElectron as getIsElectron, getMobileOS } from 'utils/clientUtil'

const AMP_API_KEY = env.AMPLITUDE_API_KEY
const AMPLITUDE_PROXY = env.AMPLITUDE_PROXY

const isAmplitudeConfigured = !!AMP_API_KEY && !!AMPLITUDE_PROXY

// Lazy-loaded Amplitude SDK
let amplitudeInstance: typeof import('@amplitude/analytics-browser') | null = null
let sessionReplayPluginInstance: typeof import('@amplitude/plugin-session-replay-browser') | null = null
let amplitudeInitPromise: Promise<void> | null = null
let isInitialized = false

/**
 * Lazy-load Amplitude SDK
 */
const getAmplitude = async () => {
  if (amplitudeInstance) {
    return amplitudeInstance
  }
  
  amplitudeInstance = await import('@amplitude/analytics-browser')
  return amplitudeInstance
}

/**
 * Lazy-load Session Replay Plugin
 */
const getSessionReplayPlugin = async () => {
  if (sessionReplayPluginInstance) {
    return sessionReplayPluginInstance
  }
  
  sessionReplayPluginInstance = await import('@amplitude/plugin-session-replay-browser')
  return sessionReplayPluginInstance
}

/**
 * ========================= Amplitude Analytics =========================
 * Description:
 *  The Amplitude library using V2 API
 */
export const init = async (isMobile: boolean) => {
  if (amplitudeInitPromise) {
    return amplitudeInitPromise
  }
  
  if (isInitialized) {
    return
  }
  
  amplitudeInitPromise = (async () => {
    try {
      if (isAmplitudeConfigured) {
        // Lazy load Amplitude SDK and plugin
        const [amplitude, sessionReplayPlugin] = await Promise.all([
          getAmplitude(),
          getSessionReplayPlugin()
        ])
        
        amplitude.init(AMP_API_KEY, {
          serverUrl: AMPLITUDE_PROXY,
          defaultTracking: {
            sessions: true
          }
        })
        
        const sessionReplayTracking = sessionReplayPlugin.sessionReplayPlugin()
        amplitude.add(sessionReplayTracking)

        const source = getSource(isMobile)
        amplitude.track(Name.SESSION_START, { source })
        
        isInitialized = true
      }
    } catch (err) {
      console.error(err)
      amplitudeInitPromise = null
      throw err
    }
  })()
  
  return amplitudeInitPromise
}

// Identify User
export const identify = async (traits?: IdentifyTraits, callback?: () => void) => {
  if (!isAmplitudeConfigured) {
    if (callback) callback()
    return
  }

  try {
    const amplitude = await getAmplitude()
    
    if (traits?.handle) {
      amplitude.setUserId(traits.handle)
    }
    if (traits && Object.keys(traits).length > 0) {
      const identifyObj = new amplitude.Identify()
      Object.entries(traits).map(([k, v]) => identifyObj.set(k, v))
      amplitude.identify(identifyObj)
    }
    if (callback) callback()
  } catch (err) {
    console.error('Failed to identify user in Amplitude:', err)
    if (callback) callback()
  }
}

// Track Event
export const track = async (
  event: string,
  properties?: Record<string, any>,
  callback?: () => void
) => {
  if (!isAmplitudeConfigured) {
    if (callback) callback()
    return
  }
  
  try {
    const amplitude = await getAmplitude()
    amplitude.track(event, properties)
    if (callback) {
      callback()
    }
  } catch (err) {
    console.error('Failed to track event in Amplitude:', err)
    if (callback) {
      callback()
    }
  }
}

export const getSource = (isMobile: boolean) => {
  const mobileOS = getMobileOS()
  const isElectron = getIsElectron()
  if (isMobile) {
    if (mobileOS === MobileOS.ANDROID) {
      return 'Android Web'
    } else if (mobileOS === MobileOS.IOS) {
      return 'iOS Web'
    } else if (mobileOS === MobileOS.WINDOWS_PHONE) {
      return 'iOS Web'
    }
    return 'Unknown Mobile Web'
  } else if (isElectron) {
    const platform = window.navigator.platform
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']
    if (macosPlatforms.indexOf(platform) !== -1) {
      return 'MacOS'
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
      return 'Windows'
    } else if (/Linux/.test(platform)) {
      return 'Linux'
    }
    return 'Unknown Desktop'
  }
}
