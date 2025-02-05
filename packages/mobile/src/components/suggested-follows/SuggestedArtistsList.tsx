import { useCallback } from 'react'

import { useSuggestedArtists } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import {
  removeFollowArtists,
  addFollowArtists
} from 'common/store/pages/signon/actions'
import { getFollowIds } from 'common/store/pages/signon/selectors'
import LinearGradient from 'react-native-linear-gradient'
import { useDispatch, useSelector } from 'react-redux'

import type { UserListProps } from 'app/components/user-list'
import { ProfileCard, UserList } from 'app/components/user-list'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const useStyles = makeStyles(({ palette }) => ({
  activeText: {
    color: palette.staticWhite
  }
}))

type SuggestedArtistsListProps = {} & Partial<UserListProps>

export const SuggestedArtistsList = (props: SuggestedArtistsListProps) => {
  const styles = useStyles()
  const { secondaryLight2, secondaryDark2, white } = useThemeColors()
  const dispatch = useDispatch()

  const { data: suggestedArtists } = useSuggestedArtists()
  const selectedArtistIds: ID[] = useSelector(getFollowIds)

  const handleSelectArtist = useCallback(
    (userId: number) => {
      const isSelected = selectedArtistIds.includes(userId)
      if (isSelected) {
        dispatch(removeFollowArtists([userId]))
      } else {
        dispatch(addFollowArtists([userId]))
      }
    },
    [selectedArtistIds, dispatch]
  )

  return (
    <UserList
      profiles={suggestedArtists}
      renderItem={({ item: artist }) => {
        const { user_id } = artist
        const isSelected = selectedArtistIds.includes(user_id)

        const gradientColors = isSelected
          ? [secondaryLight2, secondaryDark2]
          : [white, white]

        const textStyles = isSelected
          ? {
              primaryText: styles.activeText,
              secondaryText: styles.activeText
            }
          : undefined

        return (
          <ProfileCard
            profile={artist}
            preventNavigation
            onPress={() => handleSelectArtist(user_id)}
            TileProps={{ as: LinearGradient, colors: gradientColors }}
            styles={textStyles}
          />
        )
      }}
      {...props}
    />
  )
}
