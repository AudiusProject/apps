import { CollectionsPageType } from '@audius/common/store'

import { useIsMobile } from 'hooks/useIsMobile'

import DesktopCollectionPage from './components/desktop/CollectionPage'
import MobileCollectionPage from './components/mobile/CollectionPage'

type CollectionPageProps = {
  type: CollectionsPageType
}

const CollectionPage = (props: CollectionPageProps) => {
  const { type } = props
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileCollectionPage type={type} />
  }

  return <DesktopCollectionPage type={type} />
}

export default CollectionPage
