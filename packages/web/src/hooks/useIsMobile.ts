import { useSsrContext } from 'ssr/SsrContext'

export const useIsMobile = () => {
  const { isMobile } = useSsrContext()
  return isMobile
}
