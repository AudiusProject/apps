import { RefObject } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import ContestPageDesktopContent from './components/desktop/ContestPage'
import ContestPageMobileContent from './components/mobile/ContestPage'

type ContestPageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const ContestPage = ({ containerRef }: ContestPageProps) => {
  const isMobile = useIsMobile()

  return isMobile ? (
    <ContestPageMobileContent containerRef={containerRef} />
  ) : (
    <ContestPageDesktopContent containerRef={containerRef} />
  )
}

export default ContestPage
