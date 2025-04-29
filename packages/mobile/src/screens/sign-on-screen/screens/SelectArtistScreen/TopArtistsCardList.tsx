import {
  useGetTopArtistsInGenre,
  useGetFeaturedArtists
} from '@audius/common/api'
import type { QueryHookOptions } from '@audius/common/audius-query'
import type { Genre } from '@audius/common/utils'
import { convertGenreLabelToValue } from '@audius/common/utils'
import { css } from '@emotion/native'
import { useIsFocused, type RouteProp } from '@react-navigation/native'

import { Box, useTheme } from '@audius/harmony-native'
import { CardList } from 'app/components/core'

import { FollowArtistCard, FollowArtistTileSkeleton } from './FollowArtistCard'
import { PreviewArtistHint } from './PreviewArtistHint'

export const useGetTopArtists = (genre: string, options?: QueryHookOptions) => {
  const useGetArtistsHook =
    genre === 'Featured' ? useGetFeaturedArtists : useGetTopArtistsInGenre

  return useGetArtistsHook({ genre }, options)
}

type Props = {
  route: RouteProp<any>
}

export const TopArtistsCardList = (props: Props) => {
  const { name: genre } = props.route
  const isFocused = useIsFocused()
  const { spacing } = useTheme()

  const { data: artists } = useGetTopArtists(
    convertGenreLabelToValue(genre as Genre),
    {
      disabled: !isFocused
    }
  )

  return (
    <CardList
      ListHeaderComponent={genre === 'Featured' ? <PreviewArtistHint /> : null}
      data={artists}
      style={css({ paddingTop: spacing.xl })}
      renderItem={({ item, index }) => (
        <FollowArtistCard
          artist={item}
          showPreviewHint={genre === 'Featured' && index === 0}
        />
      )}
      numColumns={2}
      isCollapsible
      // TODO: Figure out sticky header and footers
      ListFooterComponent={<Box h={148} />}
      LoadingCardComponent={FollowArtistTileSkeleton}
    />
  )
}
