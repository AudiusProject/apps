import {
  Fragment,
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useState
} from 'react'

import { useRelatedArtistsUsers } from '@audius/common/api'
import { Name, FollowSource, SquareSizes, ID } from '@audius/common/models'
import { usersSocialActions as socialActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { FollowButton, IconButton, IconClose, Image } from '@audius/harmony'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { ArtistPopover } from 'components/artist/ArtistPopover'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import UserBadges from 'components/user-badges/UserBadges'
import { useIsMobile } from 'hooks/useIsMobile'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { push } from 'utils/navigation'

import styles from './ArtistRecommendations.module.css'

const { profilePage } = route

export type ArtistRecommendationsProps = {
  itemClassName?: string
  className?: string
  renderHeader: () => ReactNode
  renderSubheader?: () => ReactNode
  artistId: ID
  onClose: () => void
}

const messages = {
  follow: 'Follow All',
  unfollow: 'Unfollow All',
  following: 'Following All',
  featuring: 'Featuring',
  and: 'and',
  other: 'other',
  others: 'others'
}
const ArtistProfilePictureWrapper = ({
  userId,
  handle
}: {
  userId: number
  handle: string
}) => {
  const profilePicture = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })

  const isMobile = useIsMobile()
  if (isMobile) {
    return <Image className={styles.profilePicture} src={profilePicture} />
  }
  return (
    <ArtistPopover handle={handle}>
      <div>
        <Image className={styles.profilePicture} src={profilePicture} />
      </div>
    </ArtistPopover>
  )
}

const ArtistPopoverWrapper = ({
  userId,
  handle,
  name,
  onArtistNameClicked,
  closeParent
}: {
  userId: ID
  handle: string
  name: string
  onArtistNameClicked: (handle: string) => void
  closeParent: () => void
}) => {
  const onArtistNameClick = useCallback(() => {
    onArtistNameClicked(handle)
    closeParent()
  }, [onArtistNameClicked, handle, closeParent])
  const isMobile = useIsMobile()
  return (
    <div className={styles.artistLink} role='link' onClick={onArtistNameClick}>
      {!isMobile ? <ArtistPopover handle={handle}>{name}</ArtistPopover> : name}
      <UserBadges
        userId={userId}
        className={styles.verified}
        size='3xs'
        inline={true}
      />
    </div>
  )
}

export const ArtistRecommendations = forwardRef<
  HTMLDivElement,
  ArtistRecommendationsProps
>((props, ref) => {
  const {
    className,
    itemClassName,
    artistId,
    renderHeader,
    renderSubheader,
    onClose
  } = props
  const dispatch = useDispatch()
  const [hasFollowedAll, setHasFollowedAll] = useState(false)

  const { data: suggestedArtists = [] } = useRelatedArtistsUsers({
    artistId,
    filterFollowed: true,
    pageSize: 7
  })

  // Follow/Unfollow listeners
  const handleFollowAll = useCallback(() => {
    suggestedArtists.forEach((a) => {
      dispatch(socialActions.followUser(a.user_id, FollowSource.USER_LIST))
    })
    setHasFollowedAll(true)
  }, [dispatch, suggestedArtists])

  const handleUnfollowAll = useCallback(() => {
    suggestedArtists.forEach((a) => {
      dispatch(socialActions.unfollowUser(a.user_id, FollowSource.USER_LIST))
    })
    setHasFollowedAll(false)
  }, [dispatch, suggestedArtists])

  // Navigate to profile pages on artist links
  const onArtistNameClicked = useCallback(
    (handle: string) => {
      dispatch(push(profilePage(handle)))
    },
    [dispatch]
  )

  const isLoading = !suggestedArtists || suggestedArtists.length === 0
  const featuredArtists = suggestedArtists
    .filter((artist) => artist.name.trim().length > 0)
    .slice(0, 3)
  const remainingArtistCount = suggestedArtists.length - featuredArtists.length
  const remainingArtistLabel =
    remainingArtistCount === 1 ? messages.other : messages.others

  const renderMainContent = () => {
    if (isLoading) return <LoadingSpinner className={styles.spinner} />
    return (
      <>
        <div
          className={cn(
            styles.profilePictureList,
            styles.contentItem,
            itemClassName
          )}
        >
          {suggestedArtists.map((a) => (
            <div key={a.user_id} className={styles.profilePictureWrapper}>
              <ArtistProfilePictureWrapper
                userId={a.user_id}
                handle={a.handle}
              />
            </div>
          ))}
        </div>
        {featuredArtists.length === 0 ? null : (
          <div className={cn(styles.contentItem, itemClassName)}>
            {`${messages.featuring} `}
            {featuredArtists.map((artist, index) => (
              <Fragment key={artist.user_id}>
                {index === 0 ? null : ', '}
                <ArtistPopoverWrapper
                  userId={artist.user_id}
                  handle={artist.handle}
                  name={artist.name.trim()}
                  onArtistNameClicked={onArtistNameClicked}
                  closeParent={onClose}
                />
              </Fragment>
            ))}
            {remainingArtistCount > 0
              ? `, ${messages.and} ${remainingArtistCount} ${remainingArtistLabel}`
              : ''}
          </div>
        )}
      </>
    )
  }

  const record = useRecord()
  useEffect(() => {
    record(
      make(Name.PROFILE_PAGE_SHOWN_ARTIST_RECOMMENDATIONS, {
        userId: artistId
      })
    )
  }, [record, artistId])

  return (
    <div className={cn(styles.content, className)} ref={ref}>
      <div className={cn(styles.headerBar, styles.contentItem, itemClassName)}>
        <IconButton
          icon={IconClose}
          onClick={onClose}
          aria-label='Dismiss'
          color='subdued'
          size='m'
        />
        {renderHeader()}
      </div>
      {renderSubheader && renderSubheader()}
      {renderMainContent()}
      <div className={cn(styles.contentItem, itemClassName)}>
        <FollowButton
          disabled={isLoading}
          isFollowing={hasFollowedAll}
          messages={messages}
          onFollow={handleFollowAll}
          onUnfollow={handleUnfollowAll}
        />
      </div>
    </div>
  )
})
