import copy from 'copy-to-clipboard'

import { getAudiusHostname } from './getEnv'

export const formatShareText = (title, creator) => {
  return `${title} by ${creator} on Audius`
}

export const getAudiusURL = () => {
  // This envvar only exists in the develop config -
  // otherwise it's lifted from the window.location in production.
  const hostname = getAudiusHostname()
  if (!hostname) {
    return `https://${window.location.host}`
  }
  const scheme = process.env.VITE_AUDIUS_SCHEME

  return `${scheme}://${hostname}`
}

export const getCopyableLink = (path) => {
  return `${path || ''}#embed`
}

export const share = (url, title, creator) => {
  const shareableLink = getCopyableLink(url)
  const shareText = formatShareText(title, creator)
  // @ts-ignore: navigator may have share field in updated browsers
  if (navigator.share) {
    // @ts-ignore: navigator may have share field in updated browsers
    navigator.share({
      shareText,
      url: shareableLink
    })
  } else {
    copy(shareableLink)
  }
}
