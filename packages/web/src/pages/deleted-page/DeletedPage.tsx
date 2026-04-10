import { Playable, User } from '@audius/common/models'

import { useIsMobile } from 'hooks/useIsMobile'

import DeletedPageDesktopContent from './components/desktop/DeletedPage'
import DeletedPageMobileContent from './components/mobile/DeletedPage'

export type DeletedPageHelpLink = {
  href: string
  text: string
}

type DeletedPageProps = {
  title: string
  description: string
  canonicalUrl: string
  structuredData?: Object
  playable: Playable
  user: User
  deletedByArtist?: boolean
  helpLink?: DeletedPageHelpLink
  secondaryHelpLink?: DeletedPageHelpLink
}

const DeletedPage = ({
  title,
  description,
  canonicalUrl,
  structuredData,
  playable,
  user,
  deletedByArtist = true,
  helpLink,
  secondaryHelpLink
}: DeletedPageProps) => {
  const isMobile = useIsMobile()

  const props = {
    title,
    description,
    canonicalUrl,
    structuredData,
    playable,
    user,
    deletedByArtist,
    helpLink,
    secondaryHelpLink
  }

  return isMobile ? (
    <DeletedPageMobileContent {...props} />
  ) : (
    <DeletedPageDesktopContent {...props} />
  )
}

export default DeletedPage
