import { RefObject } from 'react'

import {
  getRelatedArtistsQueryKey,
  useRelatedArtistsUsers
} from '@audius/common/api'
import { ID, User } from '@audius/common/models'
import { cacheUsersSelectors } from '@audius/common/store'
import { MAX_PROFILE_RELATED_ARTISTS } from '@audius/common/utils'
import { Popup } from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'

import { useMainContentRef } from 'pages/MainContentContext'
import { AppState } from 'store/types'
import zIndex from 'utils/zIndex'

import { ArtistRecommendations } from './ArtistRecommendations'
import styles from './ArtistRecommendationsPopup.module.css'
const { getUser } = cacheUsersSelectors

type Props = {
  anchorRef: RefObject<HTMLElement>
  artistId: ID
  isVisible: boolean
  onClose: () => void
}

export const ArtistRecommendationsPopup = (props: Props) => {
  const { anchorRef, artistId, isVisible, onClose } = props
  const mainContentRef = useMainContentRef()

  // Get the artist
  const user = useSelector<AppState, User | null>((state) =>
    getUser(state, { id: artistId })
  )

  // Get the related artists which should be available in the query cache
  const queryClient = useQueryClient()
  const relatedArtists = queryClient.getQueryData(
    getRelatedArtistsQueryKey({
      artistId,
      pageSize: MAX_PROFILE_RELATED_ARTISTS
    })
  )

  // Query for suggested artists only if there are related artists in the first place
  const { data: suggestedArtists = [], isLoading } = useRelatedArtistsUsers(
    {
      artistId,
      filterFollowed: true,
      pageSize: 7
    },
    {
      enabled:
        isVisible && relatedArtists && relatedArtists.pages?.flat().length > 0
    }
  )

  // Only show popup if we have artists to recommend
  const shouldShowPopup = isVisible && !isLoading && suggestedArtists.length > 0

  if (!user) return null
  const { name } = user

  return (
    <Popup
      anchorRef={anchorRef}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      isVisible={shouldShowPopup}
      zIndex={zIndex.FOLLOW_RECOMMENDATIONS_POPUP}
      onClose={onClose}
      className={styles.popup}
      containerRef={mainContentRef}
    >
      <ArtistRecommendations
        itemClassName={styles.popupItem}
        renderHeader={() => (
          <h2 className={styles.headerTitle}>Suggested Artists</h2>
        )}
        renderSubheader={() => (
          <p className={styles.popupItem}>
            Here are some accounts that vibe well with {name}
          </p>
        )}
        artistId={artistId}
        onClose={onClose}
      />
    </Popup>
  )
}
