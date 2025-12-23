import { RefObject } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import RemixesPageDesktopContent from './components/desktop/RemixesPage'
import RemixesPageMobileContent from './components/mobile/RemixesPage'

type RemixesPageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const RemixesPage = ({ containerRef }: RemixesPageProps) => {
  const isMobile = useIsMobile()

  return isMobile ? (
    <RemixesPageMobileContent containerRef={containerRef} />
  ) : (
    <RemixesPageDesktopContent containerRef={containerRef} />
  )
}

export default RemixesPage
