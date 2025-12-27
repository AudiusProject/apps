import { RefObject } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import TrendingPageContent from './components/desktop/TrendingPageContent'
import TrendingPageMobileContent from './components/mobile/TrendingPageContent'

type TrendingPageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const TrendingPage = ({ containerRef }: TrendingPageProps) => {
  const isMobile = useIsMobile()

  return isMobile ? (
    <TrendingPageMobileContent containerRef={containerRef} />
  ) : (
    <TrendingPageContent containerRef={containerRef} />
  )
}

export default TrendingPage
