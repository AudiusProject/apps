import type { UID, LineupTrack } from '@audius/common/models'
import type { CommonState } from '@audius/common/store'
import { playerSelectors } from '@audius/common/store'
import { pluralize } from '@audius/common/utils'
import { range } from 'lodash'
import { Text, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { useSelector } from 'react-redux'

import { Box } from '@audius/harmony-native'
import Skeleton from 'app/components/skeleton'
import { flexRowCentered, makeStyles } from 'app/styles'
import type { GestureResponderHandler } from 'app/types/gesture'
const { getUid } = playerSelectors

// Max number of tracks to display
const DISPLAY_TRACK_COUNT = 5

const messages = {
  by: 'by',
  deleted: '[Deleted by Artist]'
}

type LineupTileTrackListProps = {
  isLoading?: boolean
  onPress: GestureResponderHandler
  trackCount: number
  tracks: LineupTrack[]
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
  track?: LineupTrack
  uid?: UID
  isAlbum?: boolean
  deleted?: boolean
}

const TrackItem = (props: TrackItemProps) => {
  const { showSkeleton, index, track, uid, isAlbum, deleted } = props
  const styles = useStyles()
  const isPlayingUid = useSelector(
    (state: CommonState) => getUid(state) === uid
  )
  return (
    <>
      <View style={styles.divider} />
      <View style={styles.item}>
        {showSkeleton ? (
          <Skeleton width='100%' height={10} />
        ) : !track ? null : (
          <>
            <Text style={[styles.text, isPlayingUid && styles.active]}>
              {index + 1}
            </Text>
            <Text
              style={[
                styles.text,
                styles.title,
                isPlayingUid && styles.active,
                deleted && styles.deleted
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
                  isPlayingUid && styles.active,
                  deleted && styles.deleted
                ]}
                numberOfLines={1}
              >
                {`${messages.by} ${track.user?.name}`}
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
  const { isLoading, onPress, trackCount, tracks, isAlbum } = props
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
    <Pressable onPress={onPress}>
      {tracks.slice(0, DISPLAY_TRACK_COUNT).map((track, index) => (
        <TrackItem
          key={track.uid}
          uid={track.uid}
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
