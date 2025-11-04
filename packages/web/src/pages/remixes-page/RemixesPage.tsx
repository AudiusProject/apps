import { RefObject } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import RemixesPageProvider from './RemixesPageProvider'
import NewRemixesPageDesktopContent from './components/desktop/NewRemixesPage'
import NewRemixesPageMobileContent from './components/mobile/NewRemixesPage'

type RemixesPageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const RemixesPage = ({ containerRef }: RemixesPageProps) => {
  const isMobile = useIsMobile()

  const content = isMobile
    ? NewRemixesPageMobileContent
    : NewRemixesPageDesktopContent

  return (
    <RemixesPageProvider containerRef={containerRef}>
      {/* @ts-ignore: These props match */}
      {content}
    </RemixesPageProvider>
  )
}

export default RemixesPage
