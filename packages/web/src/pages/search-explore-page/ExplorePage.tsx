import { useIsMobile } from 'hooks/useIsMobile'
import { createSeoDescription } from 'utils/seo'

import DesktopSearchExplorePage from './components/desktop/SearchExplorePage'
import MobileSearchExplorePage from './components/mobile/SearchExplorePage'

const messages = {
  title: 'Explore',
  pageTitle: 'Explore featured content on Audius',
  description: createSeoDescription('Explore featured content on Audius')
}

export const ExplorePage = () => {
  const isMobile = useIsMobile()

  const props = {
    title: messages.title,
    pageTitle: messages.pageTitle,
    description: messages.description
  }

  const Component = isMobile
    ? MobileSearchExplorePage
    : DesktopSearchExplorePage
  return <Component {...props} />
}
