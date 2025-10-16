import { useCallback } from 'react'

import { useProfileUser, useRelatedArtistsUsers } from '@audius/common/api'
import { User } from '@audius/common/models'
import { MAX_PROFILE_RELATED_ARTISTS } from '@audius/common/utils'
import { IconUserGroup } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import {
  setUsers,
  setVisibility
} from 'store/application/ui/userListModal/slice'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'

import { ProfilePageNavSectionItem } from './ProfilePageNavSectionItem'
import { ProfilePageNavSectionTitle } from './ProfilePageNavSectionTitle'
import { ProfilePictureListTile } from './ProfilePictureListTile'

const DEFAULT_RELATED_ARTISTS_COUNT = 100

const messages = {
  relatedArtists: 'Related Artists'
}

export const RelatedArtists = () => {
  const dispatch = useDispatch()
  const { user: profile } = useProfileUser()

  const artistId = profile?.user_id

  const { data: relatedArtists } = useRelatedArtistsUsers({
    artistId,
    pageSize: MAX_PROFILE_RELATED_ARTISTS
  })

  const handleClick = useCallback(() => {
    if (profile) {
      dispatch(
        setUsers({
          userListType: UserListType.RELATED_ARTISTS,
          entityType: UserListEntityType.USER,
          id: profile.user_id
        })
      )
      dispatch(setVisibility(true))
    }
  }, [profile, dispatch])

  if (!profile || !relatedArtists || relatedArtists.length === 0) {
    return null
  }

  return (
    <ProfilePageNavSectionItem>
      <ProfilePageNavSectionTitle
        title={messages.relatedArtists}
        Icon={IconUserGroup}
      />
      <ProfilePictureListTile
        onClick={handleClick}
        users={relatedArtists as User[]}
        totalUserCount={
          relatedArtists.length < MAX_PROFILE_RELATED_ARTISTS
            ? relatedArtists.length
            : DEFAULT_RELATED_ARTISTS_COUNT
        }
        limit={MAX_PROFILE_RELATED_ARTISTS}
        disableProfileClick
      />
    </ProfilePageNavSectionItem>
  )
}
