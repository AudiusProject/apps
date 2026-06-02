import type { CollectionTrack } from '@audius/common/api'
import { useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import type { CommonState } from '@audius/common/store'
import { playbackSelectors } from '@audius/common/store'
import { pluralize } from '@audius/common/utils'
import { range } from 'lodash'
import { Pressable, Text, View } from 'react-native'
import { useSelector } from 'react-redux'

import { Box } from '@audius/harmony-native'
import Skeleton from 'app/components/skeleton'
import { flexRowCentered, makeStyles } from 'app/styles'
import type { GestureResponderHandler } from 'app/types/gesture'
const { getTrackId } = playbackSelectors

// Max number of tracks to display
const DISPLAY_TRACK_COUNT = 5

const messages = {
  by: 'by',
  deleted: '[Deleted by Artist]'
}

type LineupTileTrackListProps = {
  isLoading?: boolean
  onPress: GestureResponderHandler
  onPressWithPropagationBlock?: () => void
  trackCount: number
  tracks: CollectionTrack[]
  isAlbum: boolean
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  item: {
    ...flexRowCentered(),
    justifyContent: 'flex-start',
    ...typography.body,
    width: '100%',
    height: spacing(7),
    paddingHorizontal: spacing(2)
  },

  text: {
    ...typography.body2,
    color: palette.neutralLight4,
    lineHeight: spacing(7),
    paddingHorizontal: spacing(1)
  },

  title: {
    color: palette.neutral,
    flexShrink: 1
  },

  artist: {
    flexShrink: 1
  },

  active: {
    color: palette.primary
  },

  deleted: {
    color: palette.textIconSubdued
  },

  divider: {
    marginHorizontal: spacing(3),
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight8
  },

  more: {
    color: palette.neutralLight4
  }
}))

type TrackItemProps = {
  showSkeleton?: boolean
  index: number
  track?: CollectionTrack
  trackId?: ID
  isAlbum?: boolean
  deleted?: boolean
}

const TrackItem = (props: TrackItemProps) => {
  const { showSkeleton, index, track, trackId, isAlbum, deleted } = props
  const styles = useStyles()
  const isPlayingUid = useSelector(
    (state: CommonState) => getTrackId(state) === trackId
  )
  // Mirror the web mobile CollectionTile.TrackItem path exactly: tracks
  // returned by `useOrderedCollectionTracks` are plain CollectionTrack /
  // TrackMetadata (no joined `user`), so we fetch the owner's display name
  // per row from the user cache. Hooks must run before any conditional
  // returns; passing `undefined` to useUser when no track is present is
  // safe (selector returns undefined).
  const { data: trackOwnerName } = useUser(track?.owner_id, {
    select: (user) => user?.name
  })
  return (
    <>
      <View style={styles.divider} />
      <View style={styles.item}>
        {showSkeleton ? (
          <Skeleton width='100%' height={10} />
        ) : !track ? null : (
          <>
            {/* Index also picks up the deleted style so the whole row
                grays out consistently — without this, the number column
                stays the default subdued color while the title/artist
                go further-subdued, which reads as "row partially
                deleted" rather than the intended unavailable state. */}
            <Text
              style={[
                styles.text,
                deleted && styles.deleted,
                isPlayingUid && styles.active
              ]}
            >
              {index + 1}
            </Text>
            {/*
              Active color must be the LAST entry in the style array.
              React Native's style array merge is left-to-right with later
              entries winning per-property — but when a conditional active
              style sits at index 2 and a falsy `deleted && styles.deleted`
              sits at index 3, the result on this version of RN drops the
              active override and `styles.title.color` (palette.neutral)
              wins. The index Text doesn't hit this because its array is
              only 2 entries ([text, active]). Putting `active` last
              makes the merge unambiguous: when playing, primary wins;
              when not playing, the conditional falsy entry is skipped
              and styles.title/styles.deleted resolve normally.
            */}
            <Text
              style={[
                styles.text,
                styles.title,
                deleted && styles.deleted,
                isPlayingUid && styles.active
              ]}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            {!isAlbum ? (
              <Text
                style={[
                  styles.text,
                  styles.artist,
                  deleted && styles.deleted,
                  isPlayingUid && styles.active
                ]}
                numberOfLines={1}
              >
                {`${messages.by} ${trackOwnerName ?? ''}`}
              </Text>
            ) : null}
            {deleted ? (
              <Text
                style={[
                  styles.text,
                  styles.artist,
                  isPlayingUid && styles.active,
                  styles.deleted
                ]}
              >
                {messages.deleted}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </>
  )
}

export const CollectionTileTrackList = (props: LineupTileTrackListProps) => {
  const {
    isLoading,
    onPress,
    onPressWithPropagationBlock,
    trackCount,
    tracks,
    isAlbum
  } = props
  const styles = useStyles()

  if (!tracks.length && isLoading) {
    return (
      <>
        {range(DISPLAY_TRACK_COUNT).map((i) => (
          <TrackItem key={i} index={i} showSkeleton isAlbum={isAlbum} />
        ))}
      </>
    )
  }

  const overflowTrackCount = trackCount - DISPLAY_TRACK_COUNT

  return (
    <Pressable onPressIn={onPressWithPropagationBlock} onPress={onPress}>
      {tracks.slice(0, DISPLAY_TRACK_COUNT).map((track, index) => (
        <TrackItem
          key={`${track.track_id}-${index}`}
          trackId={track.track_id}
          index={index}
          track={track}
          isAlbum={isAlbum}
          deleted={track.is_delete}
        />
      ))}
      {trackCount && trackCount > DISPLAY_TRACK_COUNT ? (
        <>
          <View style={styles.divider} />
          <Box mt='xs'>
            <Text style={[styles.item, styles.more]}>
              {`+${overflowTrackCount} ${pluralize(
                'Track',
                overflowTrackCount
              )}`}
            </Text>
          </Box>
        </>
      ) : null}
    </Pressable>
  )
}
