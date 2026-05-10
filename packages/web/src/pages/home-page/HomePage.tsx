import { useIsMobile } from 'hooks/useIsMobile'

import { DesktopHomePage } from './components/desktop/HomePage'
import { MobileHomePage } from './components/mobile/HomePage'

const messages = {
  title: 'Home',
  pageTitle: 'Your home on Audius',
  description: 'Your personalized home on Audius'
}

export const HomePage = () => {
  const isMobile = useIsMobile()
  const Component = isMobile ? MobileHomePage : DesktopHomePage
  return (
    <Component
      title={messages.title}
      pageTitle={messages.pageTitle}
      description={messages.description}
    />
  )
}

export default HomePage
