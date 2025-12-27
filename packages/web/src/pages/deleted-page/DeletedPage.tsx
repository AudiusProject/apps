import { Playable, User } from '@audius/common/models'

import { useIsMobile } from 'hooks/useIsMobile'

import DeletedPageDesktopContent from './components/desktop/DeletedPage'
import DeletedPageMobileContent from './components/mobile/DeletedPage'

type DeletedPageProps = {
  title: string
  description: string
  canonicalUrl: string
  structuredData?: Object
  playable: Playable
  user: User
  deletedByArtist?: boolean
}

const DeletedPage = ({
  title,
  description,
  canonicalUrl,
  structuredData,
  playable,
  user,
  deletedByArtist = true
}: DeletedPageProps) => {
  const isMobile = useIsMobile()

  const props = {
    title,
    description,
    canonicalUrl,
    structuredData,
    playable,
    user,
    deletedByArtist
  }

  return isMobile ? (
    <DeletedPageMobileContent {...props} />
  ) : (
    <DeletedPageDesktopContent {...props} />
  )
}

export default DeletedPage
