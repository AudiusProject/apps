import {
  MouseEvent,
  ReactNode,
  Ref,
  forwardRef,
  useEffect,
  useState
} from 'react'

import {
  useRemixContest,
  useRemixesCount,
  useTrack,
  useUser
} from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import {
  Divider,
  Flex,
  Paper,
  type PaperProps,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony'
import { Link } from 'react-router'

import { Avatar } from 'components/avatar/Avatar'
import { UserLink } from 'components/link'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { contestPage } from 'utils/route'

const messages = {
  hostedBy: 'HOSTED BY',
  endsToday: 'ENDS TODAY',
  ended: 'ENDED',
  daysLeft: (n: number) => `${n} ${n === 1 ? 'DAY' : 'DAYS'} LEFT`,
  entries: (n: number) => `${n} ${n === 1 ? 'ENTRY' : 'ENTRIES'}`
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

export type ContestCardProps = Omit<PaperProps, 'onClick'> & {
  /**
   * The parent track ID the contest is attached to. The card resolves the
   * remix-contest event (end date, prize info) internally via useRemixContest.
   */
  trackId: ID
  variant?: ContestCardVariant
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}

const COVER_HEIGHT = 96

/**
 * Renders the contest card cover as a proper `<img>` tag (instead of a CSS
 * background-image). Using a real image element lets the browser apply its
 * native image scaling on HiDPI displays, which is meaningfully crisper for
 * the wide hero variant. A Skeleton overlay fades out when the image loads.
 */
const ContestCover = ({
  src,
  children
}: {
  src?: string
  children?: ReactNode
}) => {
  const { motion } = useTheme()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(false)
  }, [src])

  return (
    <Flex
      h={COVER_HEIGHT}
      w='100%'
      justifyContent='flex-end'
      alignItems='flex-start'
      p='s'
      css={(theme) => ({
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme.color.background.surface2,
        borderBottom: `1px solid ${theme.color.border.strong}`
      })}
    >
      {!isLoaded ? (
        <Skeleton css={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      ) : null}
      {src ? (
        <img
          src={src}
          alt=''
          draggable={false}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          css={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: isLoaded ? 1 : 0,
            transition: `opacity ${motion.calm}`
          }}
        />
      ) : null}
      {children ? (
        <Flex css={{ position: 'relative', zIndex: 2 }} alignItems='flex-start'>
          {children}
        </Flex>
      ) : null}
    </Flex>
  )
}

const CardPill = ({ children }: { children: ReactNode }) => {
  const { color } = useTheme()
  return (
    <Flex
      ph='s'
      pv='2xs'
      alignItems='center'
      justifyContent='center'
      border='strong'
      css={{
        backgroundColor: color.background.surface2,
        borderRadius: 32,
        flexShrink: 0
      }}
    >
      <Text
        variant='label'
        size='m'
        color='subdued'
        css={{ textTransform: 'uppercase', whiteSpace: 'nowrap' }}
      >
        {children}
      </Text>
    </Flex>
  )
}

const StatusPill = ({ children }: { children: ReactNode }) => {
  const { color } = useTheme()
  return (
    <Flex
      ph='s'
      pv='2xs'
      alignItems='center'
      justifyContent='center'
      border='strong'
      css={{
        backgroundColor: color.background.surface2,
        borderRadius: 32
      }}
    >
      <Text
        variant='label'
        size='m'
        color='subdued'
        css={{ textTransform: 'uppercase' }}
      >
        {children}
      </Text>
    </Flex>
  )
}

export const ContestCardSkeleton = (
  props: { variant?: ContestCardVariant } & Omit<PaperProps, 'variant'>
) => {
  // Mirror the dimensions the real `ContestCard` uses so the skeleton
  // doesn't pop in shorter than the resolved card. Hero rows render
  // heading/l (line-height 40) and grid rows render heading/m
  // (line-height 32); both clamp to two lines, giving an 80 / 64 px
  // title block respectively. Earlier iterations rendered a single 28px
  // line, which was the source of the "skeleton loader is the wrong
  // size on the explore page" QA pass.
  const variant = props.variant ?? 'grid'
  const titleBlockHeight = variant === 'hero' ? 80 : 64
  return (
    <Paper
      direction='column'
      border='default'
      shadow='mid'
      w='100%'
      css={{ overflow: 'hidden', borderRadius: 14 }}
      {...props}
    >
      <Skeleton h={COVER_HEIGHT} w='100%' />
      <Flex direction='column' gap='l' p='xl'>
        <Flex gap='s' alignItems='center'>
          <Skeleton h={40} w={40} css={{ borderRadius: '50%' }} />
          <Flex direction='column' gap='2xs' flex='1 1 auto'>
            <Skeleton h={12} w='30%' />
            <Skeleton h={18} w='60%' />
          </Flex>
        </Flex>
        <Divider orientation='horizontal' />
        <Flex direction='column' gap='s'>
          <Skeleton h={titleBlockHeight} w='80%' />
          <Flex gap='s'>
            <Skeleton h={22} w={72} />
          </Flex>
        </Flex>
      </Flex>
    </Paper>
  )
}

export const ContestCard = forwardRef(
  (props: ContestCardProps, ref: Ref<HTMLDivElement>) => {
    const { trackId, variant = 'grid', onClick, ...other } = props

    const { data: track } = useTrack(trackId)
    const { data: user } = useUser(track?.owner_id)
    const { data: remixContest } = useRemixContest(trackId)
    // Hero is full-width (~960px+ at 2x DPI ≈ 1920px), so always request the
    // largest size the SDK exposes (1000×1000). Grid cards are ~309px wide so
    // 480×480 is a much better size/fidelity tradeoff.
    const { imageUrl: trackImageUrl } = useTrackCoverArt({
      trackId,
      size:
        variant === 'hero'
          ? SquareSizes.SIZE_1000_BY_1000
          : SquareSizes.SIZE_480_BY_480
    })
    // Prefer the contest's own cover photo (set on the host contest form's
    // "Cover Photo" field) over the parent track's artwork — same fallback
    // ordering the contest page itself uses.
    const contestCoverPhotoUrl = (remixContest?.eventData as any)
      ?.coverPhotoUrl as string | undefined
    const imageUrl = contestCoverPhotoUrl || trackImageUrl

    // staleTime lets the discovery endpoint's primed cache (see
    // useAllRemixContests) satisfy this query without an extra count-only
    // round-trip per card. 60s is loose enough to skip redundant refetches
    // during a single visit, tight enough that a returning user sees
    // near-live counts.
    const { data: entriesCount = 0 } = useRemixesCount(
      { trackId, isContestEntry: true },
      { enabled: !!trackId, staleTime: 60_000 }
    )
    // Line-height for heading/m + heading/l respectively, pulled from
    // Harmony typography. We pin the title row to exactly two lines so
    // cards in the grid line up regardless of title length (Figma
    // reference: the tile grid is visibly uniform even when some
    // titles wrap to two lines and others don't).
    const titleLineHeight = variant === 'hero' ? 40 : 32
    const titleBlockHeight = titleLineHeight * 2

    // Land on the dedicated contest page rather than the host's track page
    // — the contest page is the actual destination readers are trying to
    // reach from the Explore grid.
    const contestDestination = track?.permalink
      ? contestPage(track.permalink)
      : ''

    if (!track || !user || !remixContest) {
      return <ContestCardSkeleton variant={variant} {...other} />
    }

    // Skip contests whose host has been deactivated. The discovery
    // endpoint can still return these (e.g. the fake "Audius" /
    // life-audius-airdrop accounts that were deleted) but a contest
    // with a tombstoned host has no valid action surface — and showing
    // them on the explore grid was the root of the "deleted accounts
    // surface contests" bug. Returning null lets the grid auto-collapse
    // around the missing card without leaving a placeholder hole.
    if (user.is_deactivated) {
      return null
    }

    const status = formatStatus(remixContest.endDate)
    const contestTitle =
      (remixContest.eventData as any)?.title?.trim() || track.title

    return (
      <Paper
        ref={ref}
        direction='column'
        border='default'
        shadow='mid'
        w='100%'
        css={{
          overflow: 'hidden',
          borderRadius: 14,
          cursor: 'pointer',
          // Establish a positioning context for the stretched <Link> overlay
          // below, which is what lets cmd+click / middle-click open the
          // contest page in a new tab the way the browser does for any
          // ordinary anchor.
          position: 'relative'
        }}
        {...other}
      >
        {/* Cover banner */}
        <ContestCover src={imageUrl}>
          <StatusPill>{status}</StatusPill>
        </ContestCover>

        {/* Content */}
        <Flex direction='column' gap='l' p='xl'>
          <Flex gap='s' alignItems='center' w='100%'>
            <Avatar
              userId={user.user_id}
              imageSize={SquareSizes.SIZE_150_BY_150}
              css={{ width: 40, height: 40, flexShrink: 0 }}
            />
            <Flex
              direction='column'
              gap='2xs'
              css={{ flex: '1 1 auto', minWidth: 0 }}
            >
              <Text
                variant='label'
                size='m'
                color='subdued'
                css={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {messages.hostedBy}
              </Text>
              {/* UserLink is its own <a>; lift it above the stretched link
                  so the artist's profile remains independently clickable
                  (and nesting two anchors stays invalid HTML — they're
                  siblings in the stacking context, not parent/child). */}
              <UserLink
                userId={user.user_id}
                size='l'
                ellipses
                css={{ position: 'relative', zIndex: 2 }}
              />
            </Flex>
          </Flex>

          <Divider orientation='horizontal' />

          <Flex direction='column' gap='s' css={{ flex: '1 1 auto' }}>
            {/* Pin the title area to exactly two lines + vertically
                center the content. Titles that wrap use both lines;
                shorter titles sit in the middle of the reserved
                block. This is what keeps every tile in the grid the
                same height regardless of title length. */}
            <Flex
              alignItems='center'
              css={{ height: titleBlockHeight, flexShrink: 0 }}
            >
              <Text
                variant='heading'
                size={variant === 'hero' ? 'l' : 'm'}
                css={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word'
                }}
              >
                {contestTitle}
              </Text>
            </Flex>
            <Flex
              gap='s'
              wrap='nowrap'
              css={{
                overflowX: 'auto',
                overflowY: 'hidden',
                minWidth: 0,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
                // Elevate the horizontally-scrolling entries row above the
                // stretched link so horizontal scroll / pill clicks don't
                // accidentally navigate to the contest page.
                position: 'relative',
                zIndex: 2
              }}
            >
              <CardPill>{messages.entries(entriesCount)}</CardPill>
            </Flex>
          </Flex>
        </Flex>

        {/* Stretched-link overlay: a real <a> that fills the card so the
            browser handles cmd+click and middle-click natively (opening
            the contest in a new tab). Interactive descendants
            (UserLink, the entries row) opt out via a higher z-index. */}
        {contestDestination ? (
          <Link
            to={contestDestination}
            aria-label={contestTitle}
            onClick={onClick}
            css={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              textDecoration: 'none'
            }}
          />
        ) : null}
      </Paper>
    )
  }
)
