import { useIsMobile } from 'hooks/useIsMobile'

import TrackPageDesktopContent from './components/desktop/TrackPage'
import TrackPageMobileContent from './components/mobile/TrackPage'

const TrackPage = () => {
  const isMobile = useIsMobile()

  return isMobile ? <TrackPageMobileContent /> : <TrackPageDesktopContent />
}

export default TrackPage
