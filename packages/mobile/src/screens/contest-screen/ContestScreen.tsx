import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useRemixContest,
  useRemixesLineup,
  useStems,
  useTrack,
  useTrackByParams,
  useUser
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { remixesPageLineupActions } from '@audius/common/store'
import { dayjs, formatContestDeadline } from '@audius/common/utils'
import { useNavigation } from '@react-navigation/native'
import { Image, Pressable, View } from 'react-native'

import {
  Button,
  Divider,
  Flex,
  IconArrowLeft,
  IconKebabHorizontal,
  Text
} from '@audius/harmony-native'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'
import { UserLink } from 'app/components/user-link'
import { useRoute } from 'app/hooks/useRoute'

import { DownloadSection } from '../track-screen/DownloadSection'
import { RemixContestDetailsTab } from '../track-screen/RemixContestDetailsTab'
import { RemixContestPrizesTab } from '../track-screen/RemixContestPrizesTab'

const messages = {
  title: 'Remix Contest',
  submissionsDue: 'SUBMISSIONS DUE:',
  contestEnded: 'CONTEST ENDED',
  hostedBy: 'HOSTED BY',
  pickWinners: 'Pick Winners',
  enterContest: 'Enter Contest',
  details: 'Details',
  updates: 'Updates',
  submissions: 'Submissions',
  comments: 'Comments',
  days: 'DAYS',
  hours: 'HOURS',
  mins: 'MINS',
  secs: 'SECS',
  followers: 'FOLLOWERS',
  prizes: 'PRIZES',
  aboutThisContest: 'ABOUT THIS CONTEST',
  tabComingSoon: 'Coming soon on mobile native.'
}

const HERO_HEIGHT = 220
const CONTEST_PAGE_SIZE = 10

type ContestTab = 'details' | 'updates' | 'submissions' | 'comments'

// -----------------------------------------------------------------------------
// Countdown row. Matches Figma nodes 2888-131647 + 2857-99182: number and
// label share the same text color; thin vertical dividers between the four
// unit columns.
// -----------------------------------------------------------------------------
const CountdownTile = ({
  value,
  label,
  isSubdued
}: {
  value: number
  label: string
  isSubdued?: boolean
}) => (
  <Flex direction='column' alignItems='center' flex={1} gap='2xs'>
    <Text variant='heading' size='l' color={isSubdued ? 'subdued' : 'default'}>
      {String(value).padStart(2, '0')}
    </Text>
    <Text variant='label' size='xs' color={isSubdued ? 'subdued' : 'default'}>
      {label}
    </Text>
  </Flex>
)

const MobileCountdown = ({ endDate }: { endDate: string }) => {
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(t)
  }, [])
  const diffMs = Math.max(0, dayjs(endDate).diff(now))
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / dayMs)
  const hours = Math.floor((diffMs % dayMs) / (60 * 60 * 1000))
  const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
  const secs = Math.floor((diffMs % (60 * 1000)) / 1000)
  const daysSub = days === 0
  const hoursSub = daysSub && hours === 0
  const minsSub = hoursSub && mins === 0
  return (
    <Flex direction='row' alignItems='center' gap='s'>
      <CountdownTile value={days} label={messages.days} isSubdued={daysSub} />
      <Divider orientation='vertical' />
      <CountdownTile
        value={hours}
        label={messages.hours}
        isSubdued={hoursSub}
      />
      <Divider orientation='vertical' />
      <CountdownTile value={mins} label={messages.mins} isSubdued={minsSub} />
      <Divider orientation='vertical' />
      <CountdownTile value={secs} label={messages.secs} isSubdued={false} />
    </Flex>
  )
}

// -----------------------------------------------------------------------------
// Tab bar
// -----------------------------------------------------------------------------
const TabBar = ({
  active,
  onChange
}: {
  active: ContestTab
  onChange: (t: ContestTab) => void
}) => {
  const tabs: { key: ContestTab; label: string }[] = [
    { key: 'details', label: messages.details },
    { key: 'updates', label: messages.updates },
    { key: 'submissions', label: messages.submissions },
    { key: 'comments', label: messages.comments }
  ]
  return (
    <Flex direction='row' alignItems='center' justifyContent='space-around'>
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: isActive ? 'rgb(125, 47, 219)' : 'transparent'
            }}
          >
            <Text
              variant='label'
              size='s'
              color={isActive ? 'accent' : 'subdued'}
              strength='strong'
            >
              {t.label}
            </Text>
          </Pressable>
        )
      })}
    </Flex>
  )
}

// -----------------------------------------------------------------------------
// Screen
// -----------------------------------------------------------------------------
export const ContestScreen = () => {
  const { params } = useRoute<'Contest'>()
  const navigation = useNavigation()

  const { isEnabled: isContestsEnabled, isLoaded: isFlagLoaded } =
    useFeatureFlag(FeatureFlags.CONTESTS)

  const { data: track } = useTrackByParams(params ?? {})
  const trackId = track?.track_id
  const { data: user } = useUser(track?.owner_id)
  const { data: contest } = useRemixContest(trackId)
  const eventId = contest?.eventId

  const { data: currentUserId } = useCurrentUserId()
  const isOwner = !!currentUserId && currentUserId === track?.owner_id

  const [activeTab, setActiveTab] = useState<ContestTab>('details')

  // Only render the Stems & Downloads section when the track actually has
  // downloadable content — DownloadSection assumes a downloadable track
  // and its file-sizes query errors otherwise.
  const { data: downloadableFlag } = useTrack(trackId, {
    select: (t) => t?.is_downloadable
  })
  const { data: trackStems } = useStems(trackId)
  const hasDownloads =
    !!downloadableFlag || (!!trackStems && trackStems.length > 0)

  const lineup = useRemixesLineup({
    trackId: trackId ?? undefined,
    includeOriginal: false,
    includeWinners: true,
    isContestEntry: true,
    sortMethod: 'recent'
  })

  const isEnded = useMemo(() => {
    if (!contest?.endDate) return true
    return dayjs(contest.endDate).isBefore(dayjs())
  }, [contest?.endDate])

  const dueLabel = useMemo(() => {
    if (!contest?.endDate) return ''
    return formatContestDeadline(contest.endDate, 'long')
  }, [contest?.endDate])

  const handlePickWinners = useCallback(() => {
    if (!trackId) return
    // Matches the web route: <track-permalink>/pick-winners. Native nav
    // doesn't have a dedicated screen yet; placeholder no-op until one is
    // wired (separate follow-up).
    // eslint-disable-next-line no-console
    console.info('Pick winners — native screen not yet wired')
  }, [trackId])

  const handleEnterContest = useCallback(() => {
    if (!trackId) return
    // Same placeholder — native upload flow doesn't accept a pre-filled
    // remix_of param from here yet.
    // eslint-disable-next-line no-console
    console.info('Enter contest — native upload flow not yet wired')
  }, [trackId])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (isFlagLoaded && !isContestsEnabled) {
    // Feature flag off. Walk back rather than navigating a screen we can't
    // guarantee exists on every tab.
    navigation.goBack()
    return null
  }

  if (!track || !user || !contest || !eventId) {
    return (
      <Screen>
        <ScreenContent>
          <Flex p='xl'>
            <Text variant='body'>Loading contest…</Text>
          </Flex>
        </ScreenContent>
      </Screen>
    )
  }

  const contestTitle = (contest.eventData as any)?.title || track.title
  const coverArt = (contest.eventData as any)?.coverPhotoUrl

  return (
    <Screen variant='secondary'>
      <ScreenContent>
        <ScrollView>
          {/* Hero banner */}
          <View style={{ width: '100%', height: HERO_HEIGHT }}>
            {coverArt ? (
              <Image
                source={{ uri: coverArt }}
                style={{ width: '100%', height: '100%' }}
                resizeMode='cover'
              />
            ) : null}
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                padding: 6,
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.35)'
              }}
            >
              <IconArrowLeft size='m' color='staticWhite' />
            </Pressable>
          </View>

          <Flex p='l' gap='l'>
            {/* Title */}
            <Text variant='display' size='s'>
              {contestTitle}
            </Text>

            {/* Primary CTA + kebab */}
            <Flex direction='row' alignItems='center' gap='s'>
              <Flex flex={1}>
                <Button
                  variant='primary'
                  size='small'
                  onPress={isOwner ? handlePickWinners : handleEnterContest}
                  fullWidth
                >
                  {isOwner ? messages.pickWinners : messages.enterContest}
                </Button>
              </Flex>
              <Pressable style={{ padding: 8 }} onPress={() => {}}>
                <IconKebabHorizontal size='m' color='default' />
              </Pressable>
            </Flex>

            {/* Submissions Due */}
            <Flex direction='column' gap='2xs'>
              <Text variant='label' size='m' color='subdued'>
                {isEnded ? messages.contestEnded : messages.submissionsDue}
              </Text>
              {dueLabel ? (
                <Text variant='label' size='l' strength='strong'>
                  {dueLabel}
                </Text>
              ) : null}
            </Flex>

            {/* Countdown */}
            {!isEnded && contest.endDate ? (
              <MobileCountdown endDate={contest.endDate} />
            ) : null}

            <Divider />

            {/* Hosted By */}
            <Flex direction='column' gap='s'>
              <Text variant='label' size='m' color='subdued'>
                {messages.hostedBy}
              </Text>
              <UserLink userId={user.user_id} size='l' />
            </Flex>

            {/* Tabs */}
            <TabBar active={activeTab} onChange={setActiveTab} />
          </Flex>

          {/* Tab content — trackId is non-nullable here thanks to the
              early bailout above. */}
          <Flex ph='l' pb='2xl' gap='l'>
            {activeTab === 'details' && trackId != null ? (
              <>
                <Text variant='label' size='m' color='subdued'>
                  {messages.aboutThisContest}
                </Text>
                <RemixContestDetailsTab trackId={trackId} />

                <Text variant='label' size='m' color='subdued'>
                  {messages.prizes}
                </Text>
                <RemixContestPrizesTab trackId={trackId} />

                {/* Stems & Downloads — mirror of the web
                    ContestStemsCard footprint. The native
                    DownloadSection already renders its own
                    "Stems & Downloads" title + Download All flow. */}
                {hasDownloads ? <DownloadSection trackId={trackId} /> : null}
              </>
            ) : activeTab === 'submissions' ? (
              <TanQueryLineup
                queryData={lineup.data}
                isFetching={lineup.isFetching}
                isPending={lineup.isPending}
                loadNextPage={lineup.loadNextPage}
                lineup={lineup.lineup}
                pageSize={CONTEST_PAGE_SIZE}
                hasMore={!!lineup.hasNextPage}
                actions={remixesPageLineupActions}
              />
            ) : (
              // Updates + Comments: native-side contest comments feed
              // doesn't exist yet. The web-side `ContestCommentsTile`
              // uses `ComposerInput` + `useEventComments`; the native
              // port is a separate task because CommentSectionProvider
              // is track-scoped and the ComposerInput also lives web-
              // side only.
              <Text variant='body' color='subdued'>
                {messages.tabComingSoon}
              </Text>
            )}
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}

export default ContestScreen
