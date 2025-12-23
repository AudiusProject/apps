import { useIsMobile } from 'hooks/useIsMobile'

import DesktopLibraryPage from './components/desktop/LibraryPage'
import MobileLibraryPage from './components/mobile/LibraryPage'

const LibraryPage = () => {
  const isMobile = useIsMobile()

  return isMobile ? <MobileLibraryPage /> : <DesktopLibraryPage />
}

export default LibraryPage
