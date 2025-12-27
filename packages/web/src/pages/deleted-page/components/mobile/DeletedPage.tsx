import { useEffect, useCallback, useRef } from 'react'

import { useCurrentTrack } from '@audius/common/hooks'
import {
  PlayableType,
  SquareSizes,
  ID,
  Playable,
  User
} from '@audius/common/models'
import {
  lineupSelectors,
  queueSelectors,
  playerSelectors
} from '@audius/common/store'
import { route, NestedNonNullable } from '@audius/common/utils'
import { Button, IconUser } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import Lineup, { LineupProps } from 'components/lineup/Lineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import UserBadges from 'components/user-badges/UserBadges'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { push as pushRoute } from 'utils/navigation'
import { withNullGuard } from 'utils/withNullGuard'

import { moreByActions } from '../../store/lineups/more-by/actions'
import { getLineup } from '../../store/selectors'

import styles from './DeletedPage.module.css'

const { profilePage } = route
const { makeGetCurrent } = queueSelectors
const { getPlaying, getBuffering } = playerSelectors
const { makeGetLineupMetadatas } = lineupSelectors

const messages = {
  trackDeleted: 'Track [Deleted]',
  trackDeletedByArtist: 'Track [Deleted By Artist]',
  playlistDeleted: 'Playlist [Deleted by Artist]',
  albumDeleted: 'Album [Deleted By Artist]',
  checkOut: (name: string) => `Check out more by ${name}`,
  moreBy: (name: string) => `More by ${name}`
}

const TrackArt = ({ trackId }: { trackId: ID }) => {
  const image = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_480_BY_480
  })
  return <DynamicImage wrapperClassName={styles.image} image={image} />
}

const CollectionArt = ({ collectionId }: { collectionId: ID }) => {
  const image = useCollectionCoverArt({
    collectionId,
    size: SquareSizes.SIZE_480_BY_480
  })
  return <DynamicImage wrapperClassName={styles.image} image={image} />
}

export type DeletedPageProps = {
  title: string
  description: string
  canonicalUrl: string
  structuredData?: Object
  deletedByArtist: boolean
  playable: Playable
  user: User
}

const g = withNullGuard(
  ({ playable, user, ...p }: DeletedPageProps) =>
    playable?.metadata &&
    user && { ...p, playable: playable as NestedNonNullable<Playable>, user }
)

const DeletedPage = g(
  ({
    title,
    description,
    canonicalUrl,
    structuredData,
    playable,
    deletedByArtist = true,
    user
  }) => {
    const dispatch = useDispatch()
    const currentTrack = useCurrentTrack()

    const getMoreByLineup = useRef(makeGetLineupMetadatas(getLineup)).current
    const getCurrentQueueItem = useRef(makeGetCurrent()).current
    const moreBy = useSelector((state: any) => getMoreByLineup(state))
    const currentQueueItem = useSelector(getCurrentQueueItem)
    const isPlaying = useSelector(getPlaying)
    const isBuffering = useSelector(getBuffering)

    useEffect(() => {
      return function cleanup() {
        dispatch(moreByActions.reset())
      }
    }, [dispatch])

    const goToArtistPage = useCallback(() => {
      dispatch(pushRoute(profilePage(user?.handle)))
    }, [dispatch, user])

    const getLineupProps = (): LineupProps => {
      return {
        selfLoad: true,
        variant: LineupVariant.CONDENSED,
        lineup: moreBy,
        count: 5,
        playingUid: currentQueueItem.uid,
        playingSource: currentQueueItem.source,
        playingTrackId: currentTrack?.track_id ?? null,
        playing: isPlaying,
        buffering: isBuffering,
        pauseTrack: () => dispatch(moreByActions.pause()),
        playTrack: (uid?: string) => dispatch(moreByActions.play(uid)),
        actions: moreByActions,
        loadMore: (offset: number, limit: number) => {
          dispatch(
            moreByActions.fetchLineupMetadatas(offset, limit, false, {
              handle: user?.handle
            })
          )
        }
      }
    }
    const isPlaylist =
      playable.type === PlayableType.PLAYLIST ||
      playable.type === PlayableType.ALBUM
    const isAlbum = playable.type === PlayableType.ALBUM

    const headingText = isPlaylist
      ? isAlbum
        ? messages.albumDeleted
        : messages.playlistDeleted
      : deletedByArtist
        ? messages.trackDeletedByArtist
        : messages.trackDeleted

    const renderTile = () => {
      return (
        <div className={styles.tile}>
          <div className={styles.type}>{headingText}</div>
          {playable.type === PlayableType.PLAYLIST ||
          playable.type === PlayableType.ALBUM ? (
            <CollectionArt collectionId={playable.metadata.playlist_id} />
          ) : (
            <TrackArt trackId={playable.metadata.track_id} />
          )}
          <div className={styles.title}>
            <h1>
              {playable.type === PlayableType.PLAYLIST ||
              playable.type === PlayableType.ALBUM
                ? playable.metadata.playlist_name
                : playable.metadata.title}
            </h1>
          </div>
          <div className={styles.artistWrapper}>
            <span>By</span>
            <ArtistPopover handle={user.handle}>
              <h2 className={styles.artist} onClick={goToArtistPage}>
                {user.name}
                <UserBadges
                  userId={user.user_id}
                  size='s'
                  className={styles.verified}
                />
              </h2>
            </ArtistPopover>
          </div>
          <Button
            variant='secondary'
            iconLeft={IconUser}
            onClick={goToArtistPage}
          >
            {messages.checkOut(user.name)}
          </Button>
        </div>
      )
    }

    const renderLineup = () => {
      return (
        <div className={styles.lineupWrapper}>
          <div className={styles.lineupHeader}>{`${messages.moreBy(
            user.name
          )}`}</div>
          <Lineup {...getLineupProps()} />
        </div>
      )
    }

    return (
      <MobilePageContainer
        title={title}
        description={description}
        canonicalUrl={canonicalUrl}
        structuredData={structuredData}
      >
        <div className={styles.contentWrapper}>
          {renderTile()}
          {renderLineup()}
        </div>
      </MobilePageContainer>
    )
  }
)

export default DeletedPage
