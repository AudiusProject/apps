import { useCallback, useEffect, useState } from 'react'

import {
  useRemixContest,
  useRemixes,
  useTrack,
  useUser
} from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import type { ID } from '@audius/common/models'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import {
  Divider,
  Flex,
  Image,
  Paper,
  type PaperProps,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import type { AppTabScreenParamList } from 'app/screens/app-screen'

import { useTrackImage } from '../image/TrackImage'
import { UserLink } from '../user-link'

const AnimatedImage = Animated.createAnimatedComponent(Image)

const messages = {
  hostedBy: 'HOSTED BY',
  endsToday: 'ENDS TODAY',
  ended: 'ENDED',
  daysLeft: (n: number) => `${n} ${n === 1 ? 'DAY' : 'DAYS'} LEFT`,
  entries: (n: number) => `${n} ${n === 1 ? 'ENTRY' : 'ENTRIES'}`,
  prizesAvailable: 'PRIZES AVAILABLE'
}

const formatStatus = (endDate?: string | null): string => {
  if (!endDate) return messages.endsToday
  const now = Date.now()
  const end = new Date(endDate).getTime()
  const diffMs = end - now
  if (diffMs <= 0) return messages.ended
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return messages.endsToday
  return messages.daysLeft(diffDays - 1)
}

export type ContestCardVariant = 'hero' | 'grid'

type ContestCardProps = PaperProps & {
  /**
   * The parent track ID the contest is attached to. The card resolves the
   * remix-contest event (end date, prize info) internally via useRemixContest.
   */
  trackId: ID
  variant?: ContestCardVariant
  noNavigation?: boolean
}

type NavigationProp = NativeStackNavigationProp<AppTabScreenParamList>

const COVER_HEIGHT = 96

/**
 * The mobile Skeleton component fills its parent via position:absolute, so each
 * skeleton placeholder needs a relatively-positioned sizing container.
 */
const SkeletonBlock = ({
  height,
  width,
  borderRadius
}: {
  height: number
  width: number | `${number}%`
  borderRadius?: number
}) => (
  <View style={{ height, width, position: 'relative', borderRadius }}>
    <Skeleton style={{ borderRadius }} />
  </View>
)

export const ContestCardSkeleton = (
  props: { variant?: ContestCardVariant } & Omit<PaperProps, 'variant'>
) => {
  return (
    <Paper
      border='default'
      shadow='mid'
      style={{ overflow: 'hidden', borderRadius: 14 }}
      {...props}
    >
      <View
        style={{ height: COVER_HEIGHT, width: '100%', position: 'relative' }}
      >
        <Skeleton />
      </View>
      <Flex direction='column' gap='l' p='xl'>
        <Flex direction='row' gap='s' alignItems='center'>
          <SkeletonBlock height={40} width={40} borderRadius={20} />
          <Flex direction='column' gap='2xs' style={{ flex: 1, minWidth: 0 }}>
            <SkeletonBlock height={12} width='30%' />
            <SkeletonBlock height={18} width='60%' />
          </Flex>
        </Flex>
        <Divider orientation='horizontal' />
        <Flex direction='column' gap='s'>
          <SkeletonBlock height={28} width='80%' />
          <Flex direction='row' gap='s'>
            <SkeletonBlock height={22} width={72} />
            <SkeletonBlock height={22} width={120} />
          </Flex>
        </Flex>
      </Flex>
    </Paper>
  )
}

const Pill = ({
  label,
  tone = 'subdued'
}: {
  label: string
  tone?: 'default' | 'subdued'
}) => (
  <Flex
    ph='s'
    pv='2xs'
    border='strong'
    backgroundColor='surface2'
    style={{ borderRadius: 32 }}
    alignItems='center'
    justifyContent='center'
  >
    <Text
      variant='label'
      size='m'
      color={tone === 'subdued' ? 'subdued' : 'default'}
    >
      {label}
    </Text>
  </Flex>
)

/**
 * Banner-aspect cover for the contest card. Mirrors the loading pattern of
 * harmony-native's `Artwork` component (skeleton overlay, fade-in on load)
 * but sized as a fixed-height banner instead of a square.
 */
const ContestCover = ({
  source,
  children
}: {
  source: ReturnType<typeof useTrackImage>['source']
  children?: React.ReactNode
}) => {
  const { color, motion } = useTheme()
  const [isLoaded, setIsLoaded] = useState(false)
  const opacity = useSharedValue(0)

  useEffect(() => {
    setIsLoaded(false)
    opacity.value = 0
  }, [source, opacity])

  useEffect(() => {
    if (isLoaded) {
      opacity.value = withTiming(1, motion.expressive)
    }
  }, [isLoaded, opacity, motion.expressive])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <View
      style={{
        height: COVER_HEIGHT,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: color.border.strong,
        backgroundColor: color.background.surface2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {!isLoaded ? (
        <Skeleton
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1
          }}
        />
      ) : null}
      {source ? (
        <AnimatedImage
          source={source}
          resizeMode='cover'
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            },
            animatedStyle
          ]}
        />
      ) : null}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          padding: 8,
          zIndex: 2
        }}
      >
        {children}
      </View>
    </View>
  )
}

export const ContestCard = (props: ContestCardProps) => {
  const { trackId, variant = 'grid', noNavigation, ...other } = props

  const { data: track } = useTrack(trackId)
  const { data: user } = useUser(track?.owner_id)
  const { data: remixContest } = useRemixContest(trackId)

  // Hero is full-width of the device, so always request the largest size the
  // SDK exposes (1000×1000). Grid cards are narrower so 480×480 is enough.
  const { source: coverSource } = useTrackImage({
    trackId,
    size:
      variant === 'hero'
        ? SquareSizes.SIZE_1000_BY_1000
        : SquareSizes.SIZE_480_BY_480
  })

  const { data: remixesData } = useRemixes(
    { trackId, pageSize: 1, isContestEntry: true },
    { enabled: !!trackId }
  )
  const entriesCount = remixesData?.pages?.[0]?.count ?? 0

  const navigation = useNavigation<NavigationProp>()
  const handlePress = useCallback(() => {
    if (noNavigation || !trackId) return
    navigation.navigate('Track', { trackId })
  }, [navigation, trackId, noNavigation])

  if (!track || !user || !remixContest) {
    return null
  }

  const prizeInfo = remixContest.eventData?.prizeInfo
  const status = formatStatus(remixContest.endDate)

  return (
    <Paper
      onPress={handlePress}
      border='default'
      shadow='mid'
      style={{ overflow: 'hidden', borderRadius: 14 }}
      {...other}
    >
      {/* Cover banner */}
      <ContestCover source={coverSource}>
        <Pill label={status} tone='default' />
      </ContestCover>

      {/* Content */}
      <Flex direction='column' gap='l' p='xl'>
        <Flex direction='row' gap='s' alignItems='center'>
          <ProfilePicture
            userId={user.user_id}
            style={{ width: 40, height: 40, flexShrink: 0 }}
          />
          <Flex direction='column' gap='2xs' style={{ flex: 1, minWidth: 0 }}>
            <Text variant='label' size='s' color='subdued' strength='strong'>
              {messages.hostedBy}
            </Text>
            <Flex direction='row' alignItems='center' gap='2xs'>
              <UserLink userId={user.user_id} />
            </Flex>
          </Flex>
        </Flex>

        <Divider orientation='horizontal' />

        <Flex direction='column' gap='s'>
          <Text
            variant='heading'
            size={variant === 'hero' ? 'l' : 'm'}
            numberOfLines={2}
          >
            {track.title}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, flexDirection: 'row' }}
          >
            <Pill label={messages.entries(entriesCount)} />
            {prizeInfo ? <Pill label={messages.prizesAvailable} /> : null}
          </ScrollView>
        </Flex>
      </Flex>
    </Paper>
  )
}
