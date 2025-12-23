import { RefObject } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import FeedPageContent from './components/desktop/FeedPageContent'
import FeedPageMobileContent from './components/mobile/FeedPageContent'

type FeedPageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const FeedPage = ({ containerRef }: FeedPageProps) => {
  const isMobile = useIsMobile()

  return isMobile ? (
    <FeedPageMobileContent containerRef={containerRef} />
  ) : (
    <FeedPageContent containerRef={containerRef} />
  )
}

export default FeedPage
