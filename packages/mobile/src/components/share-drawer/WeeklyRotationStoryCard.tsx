import type { ID, Track, User } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { View } from 'react-native'

import { Divider, LinearGradient } from '@audius/harmony-native'
import AudiusLogo from 'app/assets/images/audiusLogoHorizontal.svg'
import { Text } from 'app/components/core'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { TrackImage } from '../image/TrackImage'

import { formatStoryArtist } from './formatStoryArtist'
import type { StoryArtist } from './formatStoryArtist'

/**
 * Logical size of the card. ViewShot scales the capture up to the 1080x1920
 * Instagram Stories canvas, so layout works in these units.
 */
export const STORY_CARD_WIDTH = 360
export const STORY_CARD_HEIGHT = 640
export const STORY_CAPTURE_WIDTH = 1080
export const STORY_CAPTURE_HEIGHT = 1920

/** How many tracks the card shows. */
export const STORY_TRACK_COUNT = 5

const messages = {
  title: 'Weekly Rotation',
  subtitle: (name: string, period: string) => `${name}'s top 5 · ${period}`,
  listenOnAudius: 'Listen on Audius'
}

export type WeeklyRotationStoryTrack = {
  track: Pick<Track, 'track_id' | 'title'>
  artist: StoryArtist | undefined
}

type WeeklyRotationStoryCardProps = {
  owner: Pick<User, 'name'>
  period: string
  tracks: WeeklyRotationStoryTrack[]
  /** Two hex colors (no `#`) for the background gradient, top to bottom. */
  gradient: [string, string]
  /** Fires once per row as its artwork finishes loading. */
  onArtworkLoad: (trackId: ID) => void
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    width: STORY_CARD_WIDTH,
    height: STORY_CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(6)
  },
  // Same white card, corner radius and padding rhythm as ShareToStorySticker.
  card: {
    width: '100%',
    backgroundColor: palette.staticWhite,
    paddingTop: spacing(4),
    paddingBottom: spacing(4.5),
    paddingHorizontal: spacing(3),
    borderRadius: 8
  },
  wordmark: {
    alignItems: 'flex-start',
    marginBottom: spacing(1)
  },
  subtitle: {
    marginBottom: spacing(3)
  },
  rows: {
    marginTop: spacing(3),
    marginBottom: spacing(3),
    gap: spacing(3)
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3)
  },
  rank: {
    width: spacing(4),
    textAlign: 'center'
  },
  artwork: {
    height: 48,
    width: 48,
    borderRadius: spacing(1)
  },
  rowText: {
    flex: 1,
    minWidth: 0
  },
  attribution: {
    marginTop: spacing(2.5),
    letterSpacing: 0.6,
    textAlign: 'center'
  }
}))

/**
 * Full-bleed 9:16 Instagram Story image for a Weekly Rotation mix: the mix's
 * top tracks on the same white card the track share sticker uses, over the
 * same dominant-color gradient the story video pipeline renders behind it.
 *
 * Rendered offscreen and captured with react-native-view-shot.
 */
export const WeeklyRotationStoryCard = ({
  owner,
  period,
  tracks,
  gradient,
  onArtworkLoad
}: WeeklyRotationStoryCardProps) => {
  const styles = useStyles()
  // Static: the card is white in both themes.
  const { staticNeutral } = useThemeColors()

  return (
    <LinearGradient
      colors={[`#${gradient[0]}`, `#${gradient[1]}`]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      <View style={styles.card}>
        <View style={styles.wordmark}>
          <AudiusLogo fill={staticNeutral} height={22} width={105} />
        </View>
        <Text
          color='staticNeutral'
          allowFontScaling={false}
          variant='h2'
          numberOfLines={1}
          noGutter
        >
          {messages.title}
        </Text>
        <Text
          color='staticNeutral'
          allowFontScaling={false}
          weight='medium'
          fontSize='medium'
          numberOfLines={1}
          noGutter
          style={styles.subtitle}
        >
          {messages.subtitle(owner.name, period)}
        </Text>
        <Divider />
        <View style={styles.rows}>
          {tracks.map(({ track, artist }, index) => (
            <View key={track.track_id} style={styles.row}>
              <Text
                color='staticNeutralLight2'
                allowFontScaling={false}
                weight='bold'
                fontSize='medium'
                noGutter
                style={styles.rank}
              >
                {index + 1}
              </Text>
              <TrackImage
                trackId={track.track_id}
                size={SquareSizes.SIZE_150_BY_150}
                style={styles.artwork}
                onLoad={() => onArtworkLoad(track.track_id)}
              />
              <View style={styles.rowText}>
                <Text
                  color='staticNeutral'
                  allowFontScaling={false}
                  weight='bold'
                  fontSize='medium'
                  numberOfLines={1}
                  noGutter
                >
                  {track.title}
                </Text>
                <Text
                  color='staticNeutralLight2'
                  allowFontScaling={false}
                  weight='medium'
                  fontSize='small'
                  numberOfLines={1}
                  noGutter
                >
                  {formatStoryArtist(artist)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Divider />
        <Text
          allowFontScaling={false}
          color='staticNeutralLight2'
          weight='bold'
          fontSize='xs'
          textTransform='uppercase'
          noGutter
          style={styles.attribution}
        >
          {messages.listenOnAudius}
        </Text>
      </View>
    </LinearGradient>
  )
}
