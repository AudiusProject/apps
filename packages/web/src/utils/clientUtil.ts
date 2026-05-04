// @ts-ignore -- Can't get mobile types to be happy
import { Client } from '@audius/common/src/models/Client'
// @ts-ignore -- Can't get mobile types to be happy
import { OS, MobileOS } from '@audius/common/src/models/OS'

declare global {
  interface Window {
    // @ts-ignore -- TODO fix mobile imports causing type errors
    opera: any
    // @ts-ignore -- TODO fix mobile imports causing type errors
    MSStream: boolean
  }
}

export const isMobileUserAgent = (userAgent: string) => {
  return (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
      userAgent
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
      userAgent.substr(0, 4)
    )
  )
}
/**
 * Client side utility to determine if the user is on a mobile device
 * This is not SSR compatible, use the `useIsMobile` hook instead
 */
export const isMobile = () => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false
  }

  // Dev-only override: setting `localStorage.__FORCE_MOBILE__ = '1'` forces
  // the client into mobile mode regardless of the real user agent, so
  // engineers + designers can preview the mobile-web layout from a desktop
  // browser without toggling Chrome DevTools device mode. Unset the key (or
  // assign any other value) to disable.
  try {
    if (window.localStorage?.getItem('__FORCE_MOBILE__') === '1') {
      return true
    }
  } catch {
    // localStorage may be unavailable (private mode, SSR); fall through.
  }

  // Respect the User-Agent so that "Request Desktop Site" works: when a
  // mobile browser toggles desktop mode the UA flips to a desktop one, and
  // we should serve the desktop app. Avoid platform/touchPoints heuristics
  // (e.g. iPadOS sending a Mac UA) that would override that explicit choice.
  // @ts-ignore -- TODO fix mobile imports causing type errors
  return isMobileUserAgent(
    // @ts-ignore -- TODO fix mobile imports causing type errors
    navigator.userAgent || navigator.vendor || window.opera
  )
}

export const isElectron = () => {
  if (typeof navigator === 'undefined') {
    return false
  }
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.indexOf(' electron/') > -1
}

export const getOS = () => {
  if (typeof window === 'undefined') return null
  const platform = window.navigator.platform

  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']

  if (macosPlatforms.indexOf(platform) !== -1) {
    return OS.MAC
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    return OS.WIN
  } else if (/Linux/.test(platform)) {
    return OS.LINUX
  }
  return null
}

export const getMobileOS = () => {
  if (typeof window === 'undefined') return null
  // @ts-ignore -- TODO fix mobile imports causing type errors
  const userAgent = navigator.userAgent || navigator.vendor || window.opera

  // Windows Phone must come first because its UA also contains "Android"
  // @ts-ignore -- TODO fix mobile imports causing type errors
  if (/windows phone/i.test(userAgent)) {
    return MobileOS.WINDOWS_PHONE
  }

  // @ts-ignore -- TODO fix mobile imports causing type errors
  if (/android/i.test(userAgent)) {
    return MobileOS.ANDROID
  }

  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  // @ts-ignore -- TODO fix mobile imports causing type errors
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return MobileOS.IOS
  }
  return null
}

/**
 * Client side utility to determining the client type
 * This is not SSR compatible, use the `useIsMobile` hook instead
 */
export const getClient = () => {
  return isElectron()
    ? Client.ELECTRON
    : isMobile()
      ? Client.MOBILE
      : Client.DESKTOP
}
