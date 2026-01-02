import { useIsMobile } from 'hooks/useIsMobile'
import { getExploreInfo } from 'ssr/metaTags'

import DesktopSearchExplorePage from './components/desktop/SearchExplorePage'
import MobileSearchExplorePage from './components/mobile/SearchExplorePage'

const exploreInfo = getExploreInfo()
const messages = {
  title: exploreInfo.title,
  pageTitle: 'Explore featured content on Audius',
  description: exploreInfo.description
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
