import { RefObject, memo } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

import ProfilePageProvider from './ProfilePageProvider'
import DesktopProfilePage from './components/desktop/ProfilePage'
import MobileProfilePage from './components/mobile/ProfilePage'

type ProfilePageProps = {
  containerRef: RefObject<HTMLDivElement>
}

const ProfilePage = ({ containerRef }: ProfilePageProps) => {
  const isMobile = useIsMobile()

  const content = isMobile ? MobileProfilePage : DesktopProfilePage

  return (
    // @ts-ignore
    <ProfilePageProvider containerRef={containerRef}>
      {content}
    </ProfilePageProvider>
  )
}

export default memo(ProfilePage)
