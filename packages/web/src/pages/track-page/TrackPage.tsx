import { useIsMobile } from 'hooks/useIsMobile'

import TrackPageProvider from './TrackPageProvider'
import TrackPageDesktopContent from './components/desktop/TrackPage'
import TrackPageMobileContent from './components/mobile/TrackPage'

const TrackPage = () => {
  const isMobile = useIsMobile()
  const content = isMobile ? TrackPageMobileContent : TrackPageDesktopContent

  // @ts-ignore
  return <TrackPageProvider>{content}</TrackPageProvider>
}

export default TrackPage
