import { IntersectionOptions, useInView } from 'react-intersection-observer'

import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

/** Wrapper around useInView with options that will notify when an element
 * is about to be visible. Configured to only fire once unless overridden.
 */
export const useDeferredElement = (args?: IntersectionOptions) => {
  const isMobile = useIsMobile()
  const mainContentRef = useMainContentRef()

  const { ref, inView } = useInView({
    root: isMobile ? null : mainContentRef.current,
    threshold: 0,
    rootMargin: '300px',
    triggerOnce: true,
    fallbackInView: true,
    ...args
  })

  return { ref, inView }
}
