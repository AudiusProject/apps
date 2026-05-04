import { useCallback } from 'react'

import {
  getUserTracksByHandleQueryKey,
  useUserTracksByHandle
} from '@audius/common/api'
import {
  PlayableType,
  SquareSizes,
  ID,
  Playable,
  User
} from '@audius/common/models'
import { route, NestedNonNullable } from '@audius/common/utils'
import { Button, IconUser, Image } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import UserBadges from 'components/user-badges/UserBadges'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { push as pushRoute } from 'utils/navigation'
import { withNullGuard } from 'utils/withNullGuard'

import styles from './DeletedPage.module.css'

const { profilePage } = route
const DELETED_MORE_BY_SOURCE = 'DELETED_MORE_BY'
const MORE_BY_LIMIT = 5

const messages = {
  trackDeleted: 'Track [Deleted]',
  trackDeletedByArtist: 'Track [Deleted By Artist]',
  playlistDeleted: 'Playlist [Deleted by Artist]',
  albumDeleted: 'Album [Deleted By Artist]',
  checkOut: (name: string) => `Check out more by ${name}`,
  moreBy: (name: string) => `More by ${name}`
}

const TrackArt = ({ trackId }: { trackId: ID }) => {
  const { imageUrl: image } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_480_BY_480
  })
  return <Image className={styles.image} src={image} />
}

const CollectionArt = ({ collectionId }: { collectionId: ID }) => {
  const { imageUrl: image } = useCollectionCoverArt({
    collectionId,
    size: SquareSizes.SIZE_480_BY_480
  })
  return <Image className={styles.image} src={image} />
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

    const moreByArgs = {
      handle: user?.handle,
      sort: 'plays' as const,
      limit: MORE_BY_LIMIT
    }
    const { data: moreByTracks = [], isPending } = useUserTracksByHandle(
      moreByArgs,
      { enabled: !!user?.handle }
    )
    const moreByTrackIds = moreByTracks.map((t) => t.track_id)

    const goToArtistPage = useCallback(() => {
      dispatch(pushRoute(profilePage(user?.handle)))
    }, [dispatch, user])
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
          <TrackLineup
            trackIds={moreByTrackIds}
            source={DELETED_MORE_BY_SOURCE}
            querySource={{
              queryKey: [
                ...getUserTracksByHandleQueryKey(moreByArgs)
              ] as unknown[]
            }}
            isPending={isPending}
            hasNextPage={false}
            variant={LineupVariant.CONDENSED}
            maxEntries={MORE_BY_LIMIT}
          />
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
