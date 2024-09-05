import { useCallback } from 'react'

import { useGatedContentAccess } from '@audius/common/hooks'
import {
  PurchaseableContentType,
  accountSelectors,
  gatedContentActions
} from '@audius/common/store'
import { Genre, getDogEarType } from '@audius/common/utils'
import { View } from 'react-native'
import { useSelector, useDispatch } from 'react-redux'

import { DogEar } from 'app/components/core'
import type { LineupTileProps } from 'app/components/lineup-tile/types'
import { setVisibility } from 'app/store/drawers/slice'

import { LineupTileActionButtons } from './LineupTileActionButtons'
import { LineupTileCoSign } from './LineupTileCoSign'
import { LineupTileMetadata } from './LineupTileMetadata'
import { LineupTileRoot } from './LineupTileRoot'
import { LineupTileStats } from './LineupTileStats'
import { LineupTileTopRight } from './LineupTileTopRight'

const { getUserId } = accountSelectors
const { setLockedContentId } = gatedContentActions

export const LineupTile = ({
  children,
  coSign,
  duration,
  favoriteType,
  hasPreview,
  hidePlays,
  hideShare,
  id,
  index,
  isTrending,
  isUnlisted,
  source,
  onPress,
  onPressOverflow,
  onPressRepost,
  onPressSave,
  onPressShare,
  onPressTitle,
  onPressPublish,
  onPressEdit,
  playCount,
  renderImage,
  repostType,
  showArtistPick,
  showRankIcon,
  title,
  item,
  user,
  isPlayingUid,
  variant,
  styles,
  TileProps
}: LineupTileProps) => {
  const {
    has_current_user_reposted,
    has_current_user_saved,
    repost_count,
    save_count
  } = item
  const dispatch = useDispatch()
  const { artist_pick_track_id, user_id } = user
  const currentUserId = useSelector(getUserId)
  const isOwner = user_id === currentUserId
  const isCollection = 'playlist_id' in item
  const isAlbum = 'is_album' in item && item.is_album
  const isTrack = 'track_id' in item
  const contentType = isTrack ? 'track' : isAlbum ? 'album' : 'playlist'
  const contentId = isTrack ? item.track_id : item.playlist_id
  const streamConditions = item.stream_conditions ?? null
  const isArtistPick = artist_pick_track_id === id
  const { hasStreamAccess } = useGatedContentAccess(item)

  const dogEarType = getDogEarType({
    streamConditions,
    isOwner,
    hasStreamAccess
  })

  const handlePress = useCallback(() => {
    if (contentId && !hasStreamAccess && !hasPreview) {
      dispatch(setLockedContentId({ id: contentId }))
      dispatch(setVisibility({ drawer: 'LockedContent', visible: true }))
    } else {
      onPress?.()
    }
  }, [contentId, hasStreamAccess, hasPreview, dispatch, onPress])

  const isLongFormContent =
    isTrack &&
    (item.genre === Genre.PODCASTS || item.genre === Genre.AUDIOBOOKS)

  const isReadonly = variant === 'readonly'
  const scale = isReadonly ? 1 : undefined

  return (
    <LineupTileRoot
      onPress={handlePress}
      style={styles}
      scaleTo={scale}
      {...TileProps}
    >
      {dogEarType ? <DogEar type={dogEarType} borderOffset={1} /> : null}
      <View>
        <LineupTileTopRight
          duration={duration}
          trackId={id}
          isLongFormContent={isLongFormContent}
          isCollection={isCollection}
        />
        <LineupTileMetadata
          coSign={coSign}
          renderImage={renderImage}
          onPressTitle={onPressTitle}
          title={title}
          user={user}
          isPlayingUid={isPlayingUid}
          type={contentType}
        />
        {/* We weren't passing coSign in and the ui is broken so I'm disabling for now */}
        {/* {coSign ? <LineupTileCoSign coSign={coSign} /> : null} */}
        <LineupTileStats
          favoriteType={favoriteType}
          repostType={repostType}
          hidePlays={hidePlays}
          id={id}
          index={index}
          isCollection={isCollection}
          isTrending={isTrending}
          variant={variant}
          isUnlisted={isUnlisted}
          playCount={playCount}
          repostCount={repost_count}
          saveCount={save_count}
          showRankIcon={showRankIcon}
          hasStreamAccess={hasStreamAccess}
          streamConditions={streamConditions}
          isOwner={isOwner}
          isArtistPick={isArtistPick}
          showArtistPick={showArtistPick}
          releaseDate={item?.release_date ? item.release_date : undefined}
          source={source}
          type={contentType}
        />
      </View>
      {children}
      {isReadonly ? null : (
        <LineupTileActionButtons
          hasReposted={has_current_user_reposted}
          hasSaved={has_current_user_saved}
          isOwner={isOwner}
          isShareHidden={hideShare}
          isUnlisted={isUnlisted}
          readonly={isReadonly}
          contentId={contentId}
          contentType={
            isTrack
              ? PurchaseableContentType.TRACK
              : PurchaseableContentType.ALBUM
          }
          streamConditions={streamConditions}
          hasStreamAccess={hasStreamAccess}
          source={source}
          onPressOverflow={onPressOverflow}
          onPressRepost={onPressRepost}
          onPressSave={onPressSave}
          onPressShare={onPressShare}
          onPressPublish={onPressPublish}
          onPressEdit={onPressEdit}
        />
      )}
    </LineupTileRoot>
  )
}
