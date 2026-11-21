import { copyLinkToClipboard, getCopyableLink } from 'utils/clipboardUtil'

export const getShare = (isMobile: boolean) => (url: string, text?: string) => {
  const shareableLink = getCopyableLink(url)

  // @ts-ignore: navigator may have share field in updated browsers
  if (typeof navigator !== 'undefined' && navigator.share && isMobile) {
    navigator
      // @ts-ignore: navigator may have share field in updated browsers
      .share({
        text,
        url: shareableLink
      })
  } else {
    copyLinkToClipboard(url)
  }
}
