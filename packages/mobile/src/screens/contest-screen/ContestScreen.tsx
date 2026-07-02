import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  getCommentQueryKey,
  getEventQueryKey,
  useCurrentUserId,
  useEventComments,
  useEventFollowState,
  useFollowEvent,
  useRemixContest,
  useStems,
  useTrack,
  useTrackByParams,
  useUnfollowEvent,
  useUser
} from '@audius/common/api'
import { Name, ShareSource } from '@audius/common/models'
import { shareModalUIActions } from '@audius/common/store'
import { dayjs, getLocalTimezone } from '@audius/common/utils'
import { PortalHost } from '@gorhom/portal'
import { useNavigation } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { Button, Divider, Flex, Text } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { ProfilePicture } from 'app/components/core/ProfilePicture'
import {
  CollapsibleTabNavigator,
  collapsibleTabScreen
} from 'app/components/top-tab-bar'
import { UserLink } from 'app/components/user-link'
import { useEnterContest } from 'app/hooks/useEnterContest'
import { useRoute } from 'app/hooks/useRoute'
import { make, track as trackEvent } from 'app/services/analytics'
import { setVisibility } from 'app/store/drawers/slice'

import { ContestHero, CONTEST_HERO_HEIGHT } from './ContestHero'
import {
  ContestNavOverlay,
  CONTEST_NAV_CONTROLS_HEIGHT
} from './ContestNavOverlay'
import { ContestPageProvider } from './ContestPageContext'
import {
  ContestScrollBridge,
  ContestScrollContext
} from './ContestScrollContext'
import { ContestCommentsTab } from './tabs/ContestCommentsTab'
import { ContestDetailsTab } from './tabs/ContestDetailsTab'
import { ContestSubmissionsTab } from './tabs/ContestSubmissionsTab'
import { ContestUpdatesTab } from './tabs/ContestUpdatesTab'
import { useContestScrollStatusBar } from './useContestScrollStatusBar'

const messages = {
  title: 'Remix Contest',
  submissionsDue: 'SUBMISSIONS DUE:',
  contestEnded: 'CONTEST ENDED',
  hostedBy: 'HOSTED BY',
  pickWinners: 'Pick Winners',
  enterContest: 'Enter Contest',
  follow: 'Follow',
  following: 'Following',
  details: 'Details',
  updates: 'Updates',
  submissions: 'Submissions',
  comments: 'Comments',
  days: 'DAYS',
  hours: 'HOURS',
  mins: 'MINS',
  secs: 'SECS'
}

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
  // Countdown tiles are pure display — `pointerEvents='none'` on the
  // whole Flex so touches fall through to the underlying scroll view
  // rather than sticking to the text.
  <Flex
    direction='column'
    alignItems='center'
    flex={1}
    gap='2xs'
    pointerEvents='none'
  >
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
    <Flex direction='row' alignItems='center' gap='s' pointerEvents='box-none'>
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

/**
 * Minimal "no-op" tab icon. `collapsibleTabScreen` always renders an
 * `Icon` above the tab label — this placeholder keeps that contract
 * satisfied while visually leaving the contest tab bar as text-only
 * (Figma calls for labels-only). Swap for a real harmony icon if
 * the designs change.
 */
const EmptyTabIcon = () => null

// -----------------------------------------------------------------------------
// Screen
// -----------------------------------------------------------------------------
export const ContestScreen = () => {
  const { params } = useRoute<'Contest'>()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const { data: track } = useTrackByParams(params ?? {})
  const trackId = track?.track_id
  const { data: user } = useUser(track?.owner_id)
  const { data: contest } = useRemixContest(trackId)
  const eventId = contest?.eventId

  const { data: currentUserId } = useCurrentUserId()
  const { data: followState, isPending: isFollowStatePending } =
    useEventFollowState(eventId)
  const { mutate: followEvent } = useFollowEvent()
  const { mutate: unfollowEvent } = useUnfollowEvent()
  const isOwner = !!currentUserId && currentUserId === track?.owner_id
  const dispatch = useDispatch()

  // Shared scroll value bridged into the contest tabs via
  // `ContestScrollBridge`. Read by `ContestNavOverlay` so the
  // floating nav bar's blur background + icon colors fade in as the
  // hero scrolls out of view — same pattern `ProfileScreen` uses.
  const scrollY = useSharedValue(0)
  useContestScrollStatusBar(scrollY)

  // Updates tab visibility — for non-hosts, hide the tab until
  // there's at least one host-authored top-level post (a "post
  // update"). The host always sees the tab so they have somewhere
  // to compose from. We mirror the filter
  // `ContestCommentsTile`/the mobile-web screen uses internally.
  const queryClient = useQueryClient()
  const { data: commentFeedItems } = useEventComments({
    eventId: eventId ?? 0,
    sortMethod: 'newest',
    enabled: !!eventId
  })
  const eventOwnerUserId = (contest as any)?.userId as number | undefined
  const hasPostUpdates = (commentFeedItems ?? []).some(({ commentId }) => {
    const comment = queryClient.getQueryData(getCommentQueryKey(commentId))
    if (!comment) return false
    const parentCommentId = (comment as any).parentCommentId
    return (
      eventOwnerUserId !== undefined &&
      (comment as any).userId === eventOwnerUserId &&
      !parentCommentId
    )
  })
  const showUpdatesTab = isOwner || hasPostUpdates

  // Per the contest QA pass the kebab affordance was replaced with a
  // dedicated share icon at the top-right of the nav overlay (and
  // Follow moved next to Enter Contest). Keep this callback as the
  // share entry point so ContestNavOverlay can invoke it directly.
  const handleShareContest = useCallback(() => {
    if (trackId == null) return
    dispatch(
      shareModalUIActions.requestOpen({
        type: 'contest',
        trackId,
        source: ShareSource.PAGE
      })
    )
  }, [dispatch, trackId])

  // Pull-to-refresh: invalidate the contest's event + comment queries so all
  // tabs (details, updates, submissions, comments) refetch the next time
  // they're focused. Mirrors the profile pull-to-refresh pattern; cover
  // photo expansion is handled by the `PullToRefreshPortalHost` below.
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = useCallback(() => {
    if (!eventId) return
    setIsRefreshing(true)
    queryClient.invalidateQueries({ queryKey: getEventQueryKey(eventId) })
    queryClient.invalidateQueries({
      // Matches QUERY_KEYS.eventComments — written this way to avoid pulling
      // the whole queryKeys map into the contest screen for one constant.
      queryKey: ['eventComments', eventId]
    })
    // Drop the spinner shortly after — the underlying queries are async but
    // we don't have a single status flag to watch like profile does.
    setTimeout(() => setIsRefreshing(false), 600)
  }, [eventId, queryClient])

  const handleToggleFollow = useCallback(() => {
    if (!eventId || !currentUserId) return
    if (followState?.isFollowed) {
      unfollowEvent({ userId: currentUserId, eventId })
    } else {
      followEvent({ userId: currentUserId, eventId })
    }
  }, [
    eventId,
    currentUserId,
    followState?.isFollowed,
    followEvent,
    unfollowEvent
  ])

  // Only render the Stems & Downloads section when the track actually
  // has downloadable content — DownloadSection assumes a downloadable
  // track and its file-sizes query errors otherwise.
  const { data: downloadableFlag } = useTrack(trackId, {
    select: (t) => t?.is_downloadable
  })
  const { data: trackStems } = useStems(trackId)
  const hasDownloads =
    !!downloadableFlag || (!!trackStems && trackStems.length > 0)

  const isEnded = useMemo(() => {
    if (!contest?.endDate) return true
    return dayjs(contest.endDate).isBefore(dayjs())
  }, [contest?.endDate])

  // Split the deadline into date + time so each part can be styled
  // independently — Figma 2888-131667 renders the date in strong
  // uppercase next to a lighter subdued time.
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
    // Reuse the existing track-screen "Pick Winners" drawer — it
    // informs the artist that picking winners has to happen in a web
    // browser. The native picking flow doesn't exist yet, so deferring
    // the user there is the same pattern the track screen already
    // uses.
    dispatch(setVisibility({ drawer: 'PickWinners', visible: true }))
  }, [trackId, dispatch])

  const enterContest = useEnterContest(trackId)
  const handleEnterContest = useCallback(async () => {
    if (trackId != null && eventId != null) {
      trackEvent(
        make({
          eventName: Name.REMIX_CONTEST_ENTER,
          remixContestId: eventId,
          trackId
        })
      )
    }
    await enterContest()
  }, [enterContest, trackId, eventId])

  // Fire a Remix Contest: View event the first time the screen resolves
  // both a trackId and an eventId. The screen is mounted once per
  // navigation push, so a ref guard makes the event idempotent across
  // unrelated re-renders (followers count update, scroll-y reaction,
  // etc.) while still firing on each fresh push.
  const hasFiredViewRef = useRef(false)
  useEffect(() => {
    if (hasFiredViewRef.current) return
    if (trackId == null || eventId == null) return
    hasFiredViewRef.current = true
    trackEvent(
      make({
        eventName: Name.REMIX_CONTEST_VIEW,
        remixContestId: eventId,
        trackId
      })
    )
  }, [trackId, eventId])

  // Hide the stack navigator header — the in-hero back button is the
  // only back affordance in the Figma (2888-131647). Leaving the
  // default header visible duplicates it. Must stay before any early
  // return so the hook order is stable across render paths.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

  if (!track || !user || !contest || !eventId || trackId == null) {
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

  // Collapsible header — returned from `renderHeader` below. Tracks
  // the exact same visual hierarchy as the previous inline version:
  // hero banner -> title -> primary CTA + kebab -> submissions due
  // -> countdown -> divider -> hosted-by row. When the user scrolls
  // in any tab body, this header slides up and the tab bar docks to
  // the top of the screen. Same collapsing pattern the profile
  // screen uses.
  // Every container in the collapsible header tree is marked with
  // `pointerEvents='box-none'` so scroll/pan gestures on blank
  // header space fall through to the underlying collapsible scroll
  // view — same pattern `ProfileHeader` uses to stay interactive
  // while scrolling. Without this, touches on the hero / title /
  // countdown zone were swallowed by the header's own Views, so
  // the collapsible animation only fired when the user happened to
  // drag inside the tab body. Interactive leaves (Pressable, Button,
  // UserLink, ContestHero's back button) still capture their own
  // taps because they're explicit touch targets — only empty space
  // becomes scroll-transparent.
  // Theme-aware `backgroundColor='white'` on the outermost wrapper so
  // the header reacts when the app theme flips (e.g. system light→dark).
  // Without it, `Tabs.Container`'s internal `topContainer` style
  // hardcodes `backgroundColor: 'white'` (literal) behind the header,
  // leaving the title / submissions-due / hosted-by block stuck on a
  // white backdrop after a theme change. Same pattern `ProfileHeader`
  // uses to cover the library default.
  const renderHeader = () => (
    <Flex backgroundColor='white' pointerEvents='box-none'>
      {/* Scroll bridge — lives inside the collapsible header so
          `useCurrentTabScrollY` resolves to the current tab's scroll
          value. It writes the scroll value into the outer
          `ContestScrollContext` so `ContestNavOverlay` (which sits
          outside the tab navigator) can animate on it. */}
      <ContestScrollBridge />
      <ContestHero trackId={track.track_id} />

      {/* `backgroundColor='white'` here is what makes the hero's
          pull-to-refresh stretch read cleanly: the scaled cover image
          intentionally bleeds past `ContestHero`'s layout box (no
          overflow:hidden anymore) so it can fill the over-scroll gap
          above, and this section's solid bg hides the downward bleed
          into the title/CTA/countdown stack. Same pattern
          `ProfileHeader` uses for the bio section below the cover
          photo. */}
      <Flex p='l' gap='l' pointerEvents='box-none' backgroundColor='white'>
        {/* Title — pure display; `pointerEvents='none'` wrapper so
            scroll gestures that land on the title pass through. */}
        <Flex pointerEvents='none'>
          <Text variant='display' size='s'>
            {contestTitle}
          </Text>
        </Flex>

        {/* Primary CTA row.
            - Host: full-width Pick Winners.
            - Non-host (active): Follow + Enter Contest as a 50/50 pair.
              The Follow button replaces the kebab/drawer affordance; the
              share icon now lives in the floating `ContestNavOverlay` at
              the top-right of the screen (see `onPressShare`).
            - Non-host (ended): just the Follow toggle, since "Enter
              Contest" isn't actionable after the deadline.
            All buttons sit inside the scrolling header so they remain
            reachable while the floating nav bar is the only thing
            persistent at the top. */}
        {isOwner ? (
          <Flex
            direction='row'
            alignItems='center'
            gap='s'
            pointerEvents='box-none'
          >
            <Flex flex={1} pointerEvents='box-none'>
              <Button
                variant='primary'
                size='small'
                onPress={handlePickWinners}
                fullWidth
              >
                {messages.pickWinners}
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Flex
            direction='row'
            alignItems='center'
            gap='s'
            pointerEvents='box-none'
          >
            <Flex flex={1} pointerEvents='box-none'>
              <Button
                variant={followState?.isFollowed ? 'secondary' : 'primary'}
                size='small'
                onPress={handleToggleFollow}
                // Show a spinner while the follow state loads instead of
                // defaulting to "Follow", which would flash before snapping
                // to "Following" for users who already follow the contest.
                isLoading={isFollowStatePending}
                disabled={!currentUserId || !eventId}
                fullWidth
              >
                {isFollowStatePending
                  ? ''
                  : followState?.isFollowed
                    ? messages.following
                    : messages.follow}
              </Button>
            </Flex>
            {!isEnded ? (
              <Flex flex={1} pointerEvents='box-none'>
                <Button
                  variant='primary'
                  size='small'
                  onPress={handleEnterContest}
                  fullWidth
                >
                  {messages.enterContest}
                </Button>
              </Flex>
            ) : null}
          </Flex>
        )}

        {/* Submissions Due block — pure display; wrap the entire
            label + date + time group in `pointerEvents='none'`. */}
        <Flex direction='column' gap='2xs' pointerEvents='none'>
          <Text variant='label' size='m' color='subdued'>
            {isEnded ? messages.contestEnded : messages.submissionsDue}
          </Text>
          {deadlineParts ? (
            <Flex direction='row' alignItems='baseline' gap='s' wrap='wrap'>
              <Text variant='label' size='l'>
                {deadlineParts.date}
              </Text>
              <Text variant='label' size='l' color='subdued'>
                {deadlineParts.time}
              </Text>
            </Flex>
          ) : null}
        </Flex>

        {/* Countdown — pure display; `MobileCountdown` and its
            `CountdownTile` children already declare
            `pointerEvents='none'` internally, but we wrap here too
            so any outer padding slot is also transparent to
            scroll. */}
        {!isEnded && contest.endDate ? (
          <Flex pointerEvents='none'>
            <MobileCountdown endDate={contest.endDate} />
          </Flex>
        ) : null}

        <Divider />

        {/* Hosted By — mixed row. The HOSTED BY label + @handle
            Text + avatar are display-only, but `UserLink` is
            interactive (tappable → profile). Split the layout so
            display text lives inside `pointerEvents='none'` nodes
            while the `UserLink` row stays `box-none` and can still
            be tapped. */}
        <Flex direction='column' gap='s' pointerEvents='box-none'>
          <Flex pointerEvents='none'>
            <Text variant='label' size='m' color='subdued'>
              {messages.hostedBy}
            </Text>
          </Flex>
          <Flex
            direction='row'
            alignItems='center'
            gap='m'
            pointerEvents='box-none'
          >
            {/* Avatar is visual-only (the sibling UserLink handles
                navigation), so make it transparent to touches. */}
            <View pointerEvents='none'>
              <ProfilePicture
                userId={user.user_id}
                style={{ width: 40, height: 40 }}
              />
            </View>
            <Flex direction='column' pointerEvents='box-none'>
              <UserLink userId={user.user_id} size='l' />
              <Flex pointerEvents='none'>
                <Text variant='body' size='s' color='subdued'>
                  @{user.handle}
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        {/* Separator between the hosted-by row and the tab strip
            below so the tab bar reads as a distinct section instead
            of running directly into the host's name. */}
        <Divider />
      </Flex>
    </Flex>
  )

  const contextValue = {
    trackId: track.track_id,
    eventId,
    eventOwnerUserId: contest.userId,
    userId: user.user_id,
    contestTitle,
    description,
    hasDownloads,
    followerCount: followState?.followerCount ?? 0
  }

  // Each tab body lives in its own file under `./tabs/` and reads
  // the shared state via `useContestPage()`. They all render with
  // `app/components/core` `FlatList` / `SectionList` variants so the
  // scroll events hook into the collapsible header wrapping them.
  const detailsScreen = collapsibleTabScreen({
    name: 'Details',
    Icon: EmptyTabIcon,
    component: ContestDetailsTab,
    refreshing: isRefreshing,
    onRefresh: handleRefresh
  })
  const updatesScreen = collapsibleTabScreen({
    name: 'Updates',
    Icon: EmptyTabIcon,
    component: ContestUpdatesTab,
    refreshing: isRefreshing,
    onRefresh: handleRefresh
  })
  const submissionsScreen = collapsibleTabScreen({
    name: 'Submissions',
    Icon: EmptyTabIcon,
    component: ContestSubmissionsTab,
    refreshing: isRefreshing,
    onRefresh: handleRefresh
  })
  const commentsScreen = collapsibleTabScreen({
    name: 'Comments',
    Icon: EmptyTabIcon,
    component: ContestCommentsTab,
    refreshing: isRefreshing,
    onRefresh: handleRefresh
  })

  return (
    <Screen>
      <ScreenContent>
        <ContestPageProvider value={contextValue}>
          <ContestScrollContext.Provider value={scrollY}>
            {/* Explicit `height: '100%'` wrapper mirrors the
                `ProfileScreen` pattern (`styles.navigator`). Without
                it, `CollapsibleTabNavigator` can't establish its own
                scroll container height and the header stops tracking
                the scroll — this was the "header doesn't scroll" bug
                on the contest page. With the wrapper the navigator
                fills the remaining space below any chrome and the
                header slides normally. */}
            {/* PullToRefresh portal target — the core FlatList /
                SectionList wrappers portal their pull-to-refresh control
                here so it lands on top of the cover photo and the gesture
                expands the cover image instead of opening a blank gap
                above the list. Mirrors the ProfileScreen pattern. */}
            <PortalHost name='PullToRefreshPortalHost' />
            <View style={{ height: '100%' }}>
              <CollapsibleTabNavigator
                renderHeader={renderHeader}
                // Hero + title + CTA + countdown + hosted-by stack.
                // This is the seed height the collapsible navigator
                // uses before its on-mount measurement kicks in —
                // over-estimating is fine (the measured value takes
                // over), but underestimating causes a visible jump.
                headerHeight={CONTEST_HERO_HEIGHT + 460}
                // Reserve enough space at full-collapse for the
                // status bar inset + our floating nav bar so the
                // overlay never overlaps the tab strip.
                minHeaderHeight={insets.top + CONTEST_NAV_CONTROLS_HEIGHT}
              >
                {detailsScreen}
                {showUpdatesTab ? updatesScreen : null}
                {submissionsScreen}
                {commentsScreen}
              </CollapsibleTabNavigator>
              <ContestNavOverlay
                title={contestTitle}
                onPressShare={handleShareContest}
              />
            </View>
          </ContestScrollContext.Provider>
        </ContestPageProvider>
      </ScreenContent>
    </Screen>
  )
}

export default ContestScreen
