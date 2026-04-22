import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from 'react'

import {
  useCurrentUserId,
  useEventFollowers,
  useEventFollowState,
  useRemixContest,
  useRemixesLineup,
  useStems,
  useTrack,
  useTrackByParams,
  useUser
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { SquareSizes, type ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { remixesPageLineupActions } from '@audius/common/store'
import { dayjs, formatCount, getLocalTimezone } from '@audius/common/utils'
import { useNavigation } from '@react-navigation/native'
import { Image, Pressable, useWindowDimensions, View } from 'react-native'
import { TabView, type SceneRendererProps } from 'react-native-tab-view'

import {
  Button,
  Divider,
  Flex,
  IconArrowLeft,
  IconCaretRight,
  IconKebabHorizontal,
  IconButton,
  Paper,
  Text
} from '@audius/harmony-native'
import {
  Screen,
  ScreenContent,
  ScrollView,
  UserGeneratedText
} from 'app/components/core'
import { ProfilePicture } from 'app/components/core/ProfilePicture'
import { useTrackImage } from 'app/components/image/TrackImage'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'
import { UserLink } from 'app/components/user-link'
import { useRoute } from 'app/hooks/useRoute'

import { DownloadSection } from '../track-screen/DownloadSection'
import { RemixContestPrizesTab } from '../track-screen/RemixContestPrizesTab'

import { ContestCommentsList } from './ContestCommentsList'

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
// Tab bar. Matches Figma mobile node 2888-131647: title-case labels
// (Details / Updates / Submissions / Comments), accent color + purple
// underline on the active tab. Uses `title` variant so the text renders
// mixed-case — the `label` variant would force uppercase and diverge
// from the Figma.
//
// Wired against the `react-native-tab-view` `SceneRendererProps` so the
// row doubles as the TabView's `renderTabBar`, and so the underline
// slides with the swipe gesture rather than snapping between tabs.
// -----------------------------------------------------------------------------
type TabRoute = { key: string; title: string }

const CONTEST_TAB_ROUTES: TabRoute[] = [
  { key: 'details', title: messages.details },
  { key: 'updates', title: messages.updates },
  { key: 'submissions', title: messages.submissions },
  { key: 'comments', title: messages.comments }
]

type TabBarProps = SceneRendererProps & {
  navigationState: { index: number; routes: TabRoute[] }
}

const TabBar = ({ navigationState, jumpTo }: TabBarProps) => {
  return (
    <Flex direction='row' alignItems='center' justifyContent='space-around'>
      {navigationState.routes.map((route, i) => {
        const isActive = navigationState.index === i
        return (
          <Pressable
            key={route.key}
            onPress={() => jumpTo(route.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: isActive ? 'rgb(125, 47, 219)' : 'transparent'
            }}
          >
            <Text
              variant='title'
              size='s'
              color={isActive ? 'accent' : 'subdued'}
              strength={isActive ? 'strong' : 'default'}
            >
              {route.title}
            </Text>
          </Pressable>
        )
      })}
    </Flex>
  )
}

const fallbackDescription =
  'Enter my remix contest before the deadline for your chance to win!'

// -----------------------------------------------------------------------------
// Followers tile. Matches Figma 2888-128953 (also web's
// `EventFollowersCard`): "FOLLOWERS (N)" label + a stacked row of
// overlapping avatars + a chevron-right button that opens the
// leaderboard. Empty follower state hides the avatar row but keeps
// the title.
// -----------------------------------------------------------------------------
// Max avatar discs surfaced before the chevron — matches the web
// reference and keeps the stack visually readable. Extra discs just
// compress the row.
const FOLLOWERS_MAX_AVATARS = 7
// Horizontal overlap between adjacent avatars. ~1/3 of the 40px
// avatar diameter, same ratio as the web leaderboard row.
const FOLLOWERS_OVERLAP_PX = 14

const EventFollowersCard = ({
  eventId,
  followerCount,
  onOpenLeaderboard
}: {
  eventId: ID
  followerCount: number
  onOpenLeaderboard?: () => void
}) => {
  const { userIds } = useEventFollowers({
    eventId,
    limit: FOLLOWERS_MAX_AVATARS
  })
  const visibleIds = (userIds ?? []).slice(0, FOLLOWERS_MAX_AVATARS)
  const hasAny = visibleIds.length > 0

  return (
    <Paper direction='column' p='l' gap='m' borderRadius='m' shadow='flat'>
      <Flex direction='row' alignItems='baseline' gap='xs'>
        <Text variant='label' size='m' color='subdued'>
          FOLLOWERS
        </Text>
        <Text variant='label' size='m' color='subdued'>
          ({formatCount(followerCount)})
        </Text>
      </Flex>
      {hasAny ? (
        <Flex
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          gap='s'
        >
          <View style={{ flexDirection: 'row' }}>
            {visibleIds.map((userId, idx) => (
              <View
                key={userId}
                style={{
                  marginLeft: idx === 0 ? 0 : -FOLLOWERS_OVERLAP_PX,
                  zIndex: idx
                }}
              >
                <ProfilePicture
                  userId={userId}
                  style={{ width: 40, height: 40 }}
                />
              </View>
            ))}
          </View>
          <IconButton
            icon={IconCaretRight}
            color='default'
            aria-label='Open contest leaderboard'
            onPress={onOpenLeaderboard ?? (() => {})}
          />
        </Flex>
      ) : null}
    </Paper>
  )
}

// -----------------------------------------------------------------------------
// Stems & Downloads tile. Matches Figma 2925-17366 (also web's
// `ContestStemsCard`): label on top, then a row with the track
// artwork thumbnail + access label ("Public Free") + artist UserLink,
// and a bottom row with a stems-count chip on the left and a
// "Download All" action on the right. Uses the track-page
// `DownloadSection` for the actual download flow — the Figma chrome
// lives only in the summary.
// -----------------------------------------------------------------------------
const ContestStemsCard = ({ trackId }: { trackId: ID }) => {
  const { data: track } = useTrack(trackId)
  const { data: artist } = useUser(track?.owner_id)
  const { data: stems = [] } = useStems(trackId)
  const { source } = useTrackImage({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })
  const src =
    source && typeof source === 'object' && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined
  const stemsCount = stems.length

  if (!track || !artist) return null

  return (
    <Paper direction='column' p='l' gap='m' borderRadius='m' shadow='flat'>
      <Text variant='label' size='m' color='subdued'>
        STEMS & DOWNLOADS
      </Text>

      {/* Header row: artwork + access label + artist link */}
      <Flex direction='row' gap='m' alignItems='center'>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: 'rgba(0,0,0,0.08)'
          }}
        >
          {src ? (
            <Image
              source={{ uri: src }}
              style={{ width: '100%', height: '100%' }}
              resizeMode='cover'
            />
          ) : null}
        </View>
        <Flex direction='column' gap='2xs' flex={1}>
          <Text variant='title' size='s'>
            Public Free
          </Text>
          <UserLink userId={artist.user_id} />
        </Flex>
      </Flex>

      {/* Bottom row: stems-count chip + Download All. The modal flow
          lives in DownloadSection on the track page; here we surface
          a single Download All action that mirrors it. */}
      <Flex
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        gap='m'
      >
        {stemsCount > 0 ? (
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.06)'
            }}
          >
            <Text variant='label' size='s' strength='strong'>
              {stemsCount === 1 ? '1 Stem' : `${stemsCount} Stems`}
            </Text>
          </View>
        ) : (
          <View />
        )}
        {/* DownloadSection below the card handles the actual file list
            + per-stem download UI. We link users to it via the
            "Download All" affordance by scrolling there / expanding it
            once it's wired — see the Details tab below. */}
        <Text variant='label' size='s' strength='strong'>
          Download All
        </Text>
      </Flex>
    </Paper>
  )
}

// -----------------------------------------------------------------------------
// Hero banner. We render a raw `<Image>` rather than the shared
// `TrackImage` component because `TrackImage` wraps its artwork in the
// `Artwork` layout, which forces a 1:1 aspect ratio (via `pt='100%'`).
// The Figma contest hero is a wide cropped banner, not a square
// thumbnail — so we pull the source via `useTrackImage` and size the
// image ourselves.
// -----------------------------------------------------------------------------
const ContestHero = ({
  trackId,
  onBack
}: {
  trackId: number
  onBack: () => void
}) => {
  const { source } = useTrackImage({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const src =
    source && typeof source === 'object' && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined

  return (
    <View style={{ width: '100%', height: HERO_HEIGHT }}>
      {src ? (
        <Image
          source={{ uri: src }}
          style={{ width: '100%', height: '100%' }}
          resizeMode='cover'
        />
      ) : null}
      <Pressable
        onPress={onBack}
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
  const { data: followState } = useEventFollowState(eventId)
  const isOwner = !!currentUserId && currentUserId === track?.owner_id

  const [tabIndex, setTabIndex] = useState(0)
  const { width: windowWidth } = useWindowDimensions()

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

  // Split the deadline into date + time so each part can be styled
  // independently — Figma 2888-131667 renders the date in strong
  // uppercase next to a lighter subdued time. Squishing both into
  // one string and one Text loses the typographic split.
  const deadlineParts = useMemo(() => {
    if (!contest?.endDate) return null
    const d = dayjs(contest.endDate)
    return {
      date: d.format('MMM D, YYYY').toUpperCase(),
      time: `${d.format('h:mm A')} (${getLocalTimezone()})`
    }
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

  // Hide the stack navigator header entirely — the in-hero back button
  // (a floating circular IconArrowLeft overlaid on the hero) IS the only
  // back affordance in the Figma (2888-131647). Leaving the default
  // header visible duplicates it. Must stay before any early return so
  // the hook order is stable across render paths.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

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
  const description = (contest.eventData as any)?.description as
    | string
    | undefined

  return (
    <Screen>
      <ScreenContent>
        <ScrollView>
          {/* Hero banner — uses the track cover art. We render a raw
              `<Image>` rather than the shared `TrackImage` component
              because `TrackImage` wraps its artwork in `Artwork`, which
              forces a 1:1 aspect ratio (via `pt='100%'`). The Figma
              hero is a wide cropped banner, not a square thumbnail. */}
          <ContestHero
            trackId={track.track_id}
            onBack={() => navigation.goBack()}
          />

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
              {deadlineParts ? (
                <Flex direction='row' alignItems='baseline' gap='s' wrap='wrap'>
                  <Text variant='label' size='l' strength='strong'>
                    {deadlineParts.date}
                  </Text>
                  <Text variant='label' size='l' color='subdued'>
                    {deadlineParts.time}
                  </Text>
                </Flex>
              ) : null}
            </Flex>

            {/* Countdown */}
            {!isEnded && contest.endDate ? (
              <MobileCountdown endDate={contest.endDate} />
            ) : null}

            <Divider />

            {/* Hosted By — avatar + name/handle, matching the web
                ContestPage "HOSTED BY" row (Figma 2888-131647). */}
            <Flex direction='column' gap='s'>
              <Text variant='label' size='m' color='subdued'>
                {messages.hostedBy}
              </Text>
              <Flex direction='row' alignItems='center' gap='m'>
                <ProfilePicture
                  userId={user.user_id}
                  style={{ width: 40, height: 40 }}
                />
                <UserLink userId={user.user_id} size='l' />
              </Flex>
            </Flex>
          </Flex>

          {/* Swipeable tabs — `TabView` handles horizontal pan + page
              indicator while the outer `ScrollView` handles vertical
              scroll. The tab bar is rendered by the TabView so its
              underline slides continuously with the swipe instead of
              snapping, which matched the request to "use a tab library
              so user can swipe left and right". */}
          <TabView
            navigationState={{
              index: tabIndex,
              routes: CONTEST_TAB_ROUTES
            }}
            onIndexChange={setTabIndex}
            renderTabBar={(props) => <TabBar {...props} />}
            renderScene={({ route }) => {
              switch (route.key) {
                case 'details':
                  return (
                    <Flex p='l' gap='l'>
                      {/* About renders the description only. The
                          deadline already appears in the header
                          above, so we don't reuse the track-page
                          `RemixContestDetailsTab` — it prepends a
                          "Submission Due:" row that would duplicate
                          the header (Figma 2888-131647). */}
                      <Text variant='label' size='m' color='subdued'>
                        {messages.aboutThisContest}
                      </Text>
                      <UserGeneratedText variant='body'>
                        {description ?? fallbackDescription}
                      </UserGeneratedText>

                      <Text variant='label' size='m' color='subdued'>
                        {messages.prizes}
                      </Text>
                      <RemixContestPrizesTab trackId={track.track_id} />

                      <EventFollowersCard
                        eventId={eventId}
                        followerCount={followState?.followerCount ?? 0}
                      />

                      {hasDownloads ? (
                        <>
                          <ContestStemsCard trackId={track.track_id} />
                          <DownloadSection trackId={track.track_id} />
                        </>
                      ) : null}
                    </Flex>
                  )
                case 'submissions':
                  // TanQueryLineup renders a SectionList with
                  // `flex: 1`. If the wrapper has no explicit
                  // height/flex the list collapses to zero, which is
                  // why "nothing shows up" on the submissions tab.
                  // `flex: 1` on the wrapper lets the list expand to
                  // the full scene container height.
                  return (
                    <View style={{ flex: 1, paddingHorizontal: 16 }}>
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
                    </View>
                  )
                case 'updates':
                  return (
                    <Flex p='l'>
                      <ContestCommentsList
                        eventId={eventId}
                        eventOwnerUserId={contest.userId}
                        mode='updates'
                        hideHeading
                      />
                    </Flex>
                  )
                case 'comments':
                default:
                  return (
                    <Flex p='l'>
                      <ContestCommentsList
                        eventId={eventId}
                        eventOwnerUserId={contest.userId}
                        mode='comments'
                      />
                    </Flex>
                  )
              }
            }}
            initialLayout={{ width: windowWidth }}
            // TabView inside a ScrollView doesn't auto-measure its
            // own height, so the tab content collapses to 0 and
            // hides every scene. Pin an explicit height via the
            // `style` prop. 700px covers Details (the tallest tab
            // on mobile — About + Prizes + Followers + Stems card +
            // DownloadSection) without burning a huge empty slab on
            // the lighter tabs; each scene scrolls internally if it
            // still overflows.
            style={{ height: 700 }}
            swipeEnabled
          />
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}

export default ContestScreen
