import amplitude from 'amplitude-js'

import { getAmplitudeAPIKey, getAmplitudeProxy } from '../util/getEnv'
import { logError } from '../util/logError'

const AMP_API_KEY = getAmplitudeAPIKey()
const AMP_PROXY = getAmplitudeProxy()

const amp = amplitude.getInstance()

const BOT_USER_AGENT_REGEX =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|prerender|phantomjs|puppeteer|playwright|selenium|facebookexternalhit|embedly|bingpreview|inspectiontool/i

// Crawlers of pages that embed the player get no analytics
const isLikelyBot = () => {
  if (typeof navigator === 'undefined') return false
  if (navigator.webdriver === true) return true
  const userAgent = navigator.userAgent || ''
  // Cubot is a phone brand, not a crawler
  return BOT_USER_AGENT_REGEX.test(userAgent) && !/cubot/i.test(userAgent)
}

let isEnabled = false

const CLIENT_IDENTIFIED_KEY = 'amplitude:clientIdentified'

// Which client the user is on, as a user property set once per device
const identifyClient = () => {
  try {
    if (window.localStorage.getItem(CLIENT_IDENTIFIED_KEY)) return
    window.localStorage.setItem(CLIENT_IDENTIFIED_KEY, '1')
  } catch {
    // Storage can be blocked in third-party iframes, so identify every load
  }
  amp.identify(new amplitude.Identify().set('client', 'Embed'))
}

export const initAnalytics = () => {
  try {
    if (AMP_API_KEY && AMP_PROXY && !isLikelyBot()) {
      amp.init(AMP_API_KEY, undefined, { apiEndpoint: AMP_PROXY })
      isEnabled = true
      identifyClient()
    }
  } catch (err) {
    logError(err)
  }
}

const SOURCE = 'embed player'

const PLAYBACK_PLAY = 'Playback: Play'
const PLAYBACK_PAUSE = 'Playback: Pause'
const LISTEN = 'Listen'

const track = (event, properties) => {
  if (isEnabled) {
    amp.logEvent(event, properties)
  }
}

/** id param is the numeric id */
export const recordPlay = (id) => {
  track(PLAYBACK_PLAY, {
    id: `${id}`,
    source: SOURCE,
    referrer: document.referrer
  })
}

/** id param is the numeric id */
export const recordPause = (id) => {
  track(PLAYBACK_PAUSE, {
    id: `${id}`,
    source: SOURCE,
    referrer: document.referrer
  })
}

/** id param is the numeric id */
export const recordListen = (id) => {
  track(LISTEN, { id: `${id}` })
}
