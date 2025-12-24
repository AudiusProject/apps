import { useEffect, useContext, useMemo } from 'react'

import { useTrackHistory, useTracks, useUsers } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Button } from '@audius/harmony'
import { Link } from 'react-router'

import { useTanQueryLineupProps } from 'components/lineup/hooks'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'
import TrackList from 'components/track/mobile/TrackList'
import { TrackItemAction } from 'components/track/mobile/TrackListItem'

import styles from './HistoryPage.module.css'

const { TRENDING_PAGE } = route

const messages = {
  header: 'LISTENING HISTORY',
  empty: {
    primary: 'You haven’t listened to any tracks yet.',
    secondary: 'Once you have, this is where you’ll find them!',
    cta: 'Start Listening'
  }
}

export type HistoryPageProps = {
  title: string
  description: string
}

export const HistoryPage = ({ title, description }: HistoryPageProps) => {
  const {
    lineup,
    isInitialLoading,
    data: trackIds,
    isPlaying,
    togglePlay
  } = useTrackHistory({
    pageSize: 50
  })
  const { data: trackData } = useTracks(
    trackIds?.map((entry) => entry.id) ?? []
  )
  const { data: users } = useUsers(
    trackData?.map((track) => track.owner_id) ?? []
  )
  const userTrackData = trackData?.map((track) => ({
    ...track,
    user: users?.find((user) => user.user_id === track.owner_id)
  }))
  const lineupProps = useTanQueryLineupProps()
  const { playingUid } = lineupProps

  // Set Header Nav
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setCenter(messages.header)
    setRight(null)
  }, [setLeft, setCenter, setRight])

  // Merge lineup entries with their corresponding track data
  const tracks = useMemo(() => {
    if (
      lineup.entries.length === 0 ||
      !userTrackData ||
      userTrackData.length === 0
    )
      return []
    return userTrackData.map((track, index) => {
      const lineupTrack = {
        ...lineup.entries[index],
        ...track
      }

      const isActive = lineupTrack.uid === playingUid

      return {
        isLoading: isInitialLoading,
        isStreamGated: lineupTrack.is_stream_gated,
        isUnlisted: lineupTrack.is_unlisted,
        isReposted: lineupTrack.has_current_user_reposted,
        isSaved: lineupTrack.has_current_user_saved,
        isActive,
        isPlaying: isActive && isPlaying,
        artistName: lineupTrack.user?.name,
        artistHandle: lineupTrack.user?.handle,
        permalink: lineupTrack.permalink,
        trackTitle: lineupTrack.title,
        trackId: lineupTrack.track_id,
        uid: lineupTrack.uid,
        isDeleted: lineupTrack.is_delete || !!lineupTrack.user?.is_deactivated,
        isLocked: false
      }
    })
  }, [lineup.entries, userTrackData, playingUid, isInitialLoading, isPlaying])

  return (
    <MobilePageContainer title={title} description={description}>
      {tracks.length === 0 && !isInitialLoading ? (
        <div className={styles.emptyContainer}>
          <div className={styles.primary}>
            {messages.empty.primary}
            <i className='emoji face-with-monocle' />
          </div>
          <div className={styles.secondary}>{messages.empty.secondary}</div>
          <Button variant='primary'>
            <Link to={TRENDING_PAGE}>{messages.empty.cta}</Link>
          </Button>
        </div>
      ) : (
        <div className={styles.trackListContainer}>
          {isInitialLoading ? (
            <LoadingSpinner className={styles.spinner} />
          ) : (
            <TrackList
              containerClassName={styles.containerClassName}
              tracks={tracks}
              itemClassName={styles.itemClassName}
              showDivider
              showBorder
              togglePlay={togglePlay}
              trackItemAction={TrackItemAction.Overflow}
            />
          )}
        </div>
      )}
    </MobilePageContainer>
  )
}
