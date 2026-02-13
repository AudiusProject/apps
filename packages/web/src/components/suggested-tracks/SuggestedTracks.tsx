import { useCallback, useMemo } from 'react'

import {
  SUGGESTED_TRACK_COUNT,
  useCollection,
  useSuggestedPlaylistTracks,
  useUser
} from '@audius/common/api'
import { SquareSizes, ID, Track } from '@audius/common/models'
import {
  Button,
  Divider,
  IconCaretDown,
  IconRefresh,
  Paper,
  useTheme
} from '@audius/harmony'
import { animated, useSpring } from '@react-spring/web'
import { useToggle } from 'react-use'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import { UserLink } from 'components/link/UserLink'
import Skeleton from 'components/skeleton/Skeleton'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { useMainContentRef } from 'pages/MainContentContext'

import styles from './SuggestedTracks.module.css'

const messages = {
  title: 'Add some tracks',
  addTrack: 'Add',
  added: 'Added',
  refresh: 'Refresh',
  expandLabel: 'Expand suggested tracks panel',
  collapseLabel: 'Collapse suggested tracks panel',
  trackAdded: (isAlbum: boolean) => `Added to ${isAlbum ? 'Album' : 'Playlist'}`
}

type SuggestedTrackProps = {
  collectionId: ID
  track: Track
  onAddTrack: (trackId: ID) => void
}

const SuggestedTrackRow = (props: SuggestedTrackProps) => {
  const { collectionId, track, onAddTrack } = props
  const { track_id, title, owner_id } = track
  const { data: user } = useUser(owner_id)
  const { data: collection } = useCollection(collectionId)
  const image = useTrackCoverArt({
    trackId: track_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const trackIsInCollection = useMemo(
    () =>
      collection?.playlist_contents.track_ids.some(
        (trackId) => trackId.track === track_id
      ),
    [collection?.playlist_contents.track_ids, track_id]
  )

  const handleAddTrack = useCallback(() => {
    onAddTrack(track_id)
  }, [onAddTrack, track_id])

  return (
    <div className={styles.suggestedTrack}>
      <div className={styles.trackDetails}>
        <DynamicImage wrapperClassName={styles.trackArtwork} image={image} />
        <div className={styles.trackInfo}>
          <p className={styles.trackName}>{title}</p>
          {user ? <UserLink userId={user.user_id} size='s' /> : null}
        </div>
      </div>
      <Button
        variant='secondary'
        size='small'
        onClick={handleAddTrack}
        onMouseDown={(e) => e.preventDefault()}
        disabled={trackIsInCollection}
      >
        {trackIsInCollection ? messages.added : messages.addTrack}
      </Button>
    </div>
  )
}

const SuggestedTrackSkeleton = () => {
  return (
    <div className={styles.suggestedTrackSkeleton}>
      <div className={styles.trackDetails}>
        <Skeleton className={styles.trackArtwork} />
        <div className={styles.trackInfo}>
          <Skeleton height='12px' width='150px' />
          <Skeleton height='12px' width='100px' />
        </div>
      </div>
    </div>
  )
}

type SuggestedTracksProps = {
  collectionId: ID
}

export const SuggestedTracks = (props: SuggestedTracksProps) => {
  const { collectionId } = props
  const mainContentRef = useMainContentRef()
  const {
    suggestedTracks,
    onRefresh,
    onAddTrack: originalOnAddTrack
  } = useSuggestedPlaylistTracks(collectionId)
  const [isExpanded, toggleIsExpanded] = useToggle(false)
  const { motion } = useTheme()

  // Preserve scroll position when adding track - prevents scroll-to-top on
  // optimistic update (e.g. from focus loss when Add button becomes disabled)
  const onAddTrack = useCallback(
    (trackId: ID) => {
      const scrollTop = mainContentRef?.current?.scrollTop ?? 0
      originalOnAddTrack(trackId)
      // Restore scroll after React has committed the update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mainContentRef?.current != null) {
            mainContentRef.current.scrollTop = scrollTop
          }
        })
      })
    },
    [originalOnAddTrack, mainContentRef]
  )

  const contentHeight = 66 + SUGGESTED_TRACK_COUNT * 74
  const contentStyles = useSpring({
    height: isExpanded ? contentHeight : 0
  })

  return (
    <Paper column css={{ textAlign: 'left' }}>
      <div
        className={styles.heading}
        role='button'
        aria-expanded={isExpanded}
        aria-label={isExpanded ? messages.collapseLabel : messages.expandLabel}
        onClick={toggleIsExpanded}
      >
        <div className={styles.headingText}>
          <h4 className={styles.title}>{messages.title}</h4>
        </div>
        <IconCaretDown
          color='subdued'
          css={{
            transition: `transform ${motion.expressive}`,
            transform: isExpanded ? `rotate(180deg)` : undefined
          }}
        />
      </div>
      <animated.div className={styles.content} style={contentStyles}>
        <ul>
          <Divider />
          {[...Array(SUGGESTED_TRACK_COUNT)].map((_, i) => (
            <li key={suggestedTracks[i]?.track_id ?? i}>
              {suggestedTracks[i] ? (
                <SuggestedTrackRow
                  track={suggestedTracks[i]}
                  collectionId={collectionId}
                  onAddTrack={onAddTrack}
                />
              ) : (
                <SuggestedTrackSkeleton />
              )}
              <Divider />
            </li>
          ))}
        </ul>
        <button className={styles.refreshButton} onClick={onRefresh}>
          <div className={styles.refreshContent}>
            <IconRefresh className={styles.refreshIcon} />
            <span className={styles.refreshText}>{messages.refresh}</span>
          </div>
        </button>
      </animated.div>
    </Paper>
  )
}
