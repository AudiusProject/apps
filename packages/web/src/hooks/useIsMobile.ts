import { useSsrContext } from 'ssr/SsrContext'

/**
 * Returns true if the current device is a mobile device, based on the user agent
 *
 * This supports SSR by pulling the value from SsrContext
 */
export const useIsMobile = () => {
  const { isMobile } = useSsrContext()
  return isMobile
}
