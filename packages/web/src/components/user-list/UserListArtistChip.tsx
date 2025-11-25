import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router-dom'

import ArtistChip, { ArtistChipProps } from 'components/artist/ArtistChip'
import { MountPlacement } from 'components/types'
import { useIsMobile } from 'hooks/useIsMobile'

const { profilePage } = route

export const UserListArtistChip = (props: ArtistChipProps) => {
  const { userId } = props
  const isMobile = useIsMobile()

  const { data: handle } = useUser(userId, { select: (user) => user.handle })

  const navigation = useNavigate()

  const handleClickArtistName = useCallback(() => {
    if (handle) {
      navigation(profilePage(handle))
    }
  }, [navigation, handle])

  return (
    <ArtistChip
      {...props}
      onClickArtistName={handleClickArtistName}
      showPopover={!isMobile}
      popoverMount={MountPlacement.BODY}
    />
  )
}
