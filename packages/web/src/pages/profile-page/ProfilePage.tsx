import { RefObject } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import DesktopProfilePage from './components/desktop/ProfilePage'
import MobileProfilePage from './components/mobile/ProfilePage'

type ProfilePageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const ProfilePage = ({ containerRef }: ProfilePageProps) => {
  const isMobile = useIsMobile()

  return isMobile ? (
    <MobileProfilePage containerRef={containerRef} />
  ) : (
    <DesktopProfilePage containerRef={containerRef} />
  )
}

export default ProfilePage
