import { RefObject } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import ContestPageDesktopContent from './components/desktop/ContestPage'
import ContestPageMobileContent from './components/mobile/ContestPage'

type ContestPageProps = {
  containerRef: RefObject<HTMLDivElement>
}

/**
 * Dedicated page for a remix contest. Replaces the in-line contest section
 * that used to live on the track page; the track page now links here via a
 * small "Contest running" CTA instead.
 *
 * The page is keyed by the same (handle, slug) pair as the parent track, but
 * hangs its data off the contest event_id rather than the track itself — this
 * is what lets comments and follows be scoped to the *event*, not the track.
 */
const ContestPage = ({ containerRef }: ContestPageProps) => {
  const isMobile = useIsMobile()

  return isMobile ? (
    <ContestPageMobileContent containerRef={containerRef} />
  ) : (
    <ContestPageDesktopContent containerRef={containerRef} />
  )
}

export default ContestPage
