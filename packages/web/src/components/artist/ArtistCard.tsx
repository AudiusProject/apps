import { MouseEventHandler, useCallback, useMemo } from 'react'

import { FollowSource, User } from '@audius/common/models'
import { usersSocialActions } from '@audius/common/store'
import { FollowButton } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import Stats, { StatProps } from 'components/stats/Stats'

import styles from './ArtistCard.module.css'
import { ArtistCardCover } from './ArtistCardCover'
const { followUser, unfollowUser } = usersSocialActions

type ArtistCardProps = {
  artist: User
  onNavigateAway: () => void
}

export const ArtistCard = (props: ArtistCardProps) => {
  const { artist, onNavigateAway } = props
  const {
    user_id,
    bio,
    track_count,
    playlist_count,
    follower_count,
    followee_count,
    does_current_user_follow,
    profile_type
  } = artist

  const dispatch = useDispatch()
  const profileType =
    profile_type === 'label' ? 'label' : track_count > 0 ? 'artist' : null

  const handleClick: MouseEventHandler = useCallback((event) => {
    event.stopPropagation()
  }, [])

  const stats = useMemo((): StatProps[] => {
    if (profileType === 'artist') {
      return [
        {
          number: track_count,
          title: track_count === 1 ? 'track' : 'tracks',
          key: 'track'
        },
        {
          number: follower_count,
          title: follower_count === 1 ? 'follower' : 'followers',
          key: 'follower'
        },
        { number: followee_count, title: 'following', key: 'following' }
      ]
    }
    return [
      {
        number: playlist_count,
        title: playlist_count === 1 ? 'playlist' : 'playlists',
        key: 'playlist'
      },
      {
        number: follower_count,
        title: follower_count === 1 ? 'follower' : 'followers',
        key: 'follower'
      },
      { number: followee_count, title: 'following', key: 'following' }
    ]
  }, [profileType, track_count, follower_count, followee_count, playlist_count])

  const handleFollow = useCallback(() => {
    dispatch(followUser(user_id, FollowSource.HOVER_TILE))
  }, [dispatch, user_id])

  const handleUnfollow = useCallback(() => {
    dispatch(unfollowUser(user_id, FollowSource.HOVER_TILE))
  }, [dispatch, user_id])

  return (
    <div className={styles.popoverContainer} onClick={handleClick}>
      <div className={styles.artistCardContainer}>
        <ArtistCardCover
          artist={artist}
          profileType={profileType}
          onNavigateAway={onNavigateAway}
        />
        <div className={styles.artistStatsContainer}>
          <Stats
            userId={user_id}
            stats={stats}
            clickable={false}
            size='medium'
          />
        </div>
        <div className={styles.contentContainer}>
          <div>
            <div className={styles.description}>{bio}</div>
            <FollowButton
              isFollowing={does_current_user_follow}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
