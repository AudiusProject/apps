import {
  MouseEvent,
  ReactNode,
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useState
} from 'react'

import {
  useRemixContest,
  useRemixes,
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
import { useLinkClickHandler } from 'react-router'

import { Avatar } from 'components/avatar/Avatar'
import { UserLink } from 'components/link'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

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

export type ContestCardProps = Omit<PaperProps, 'onClick'> & {
  /**
   * The parent track ID the contest is attached to. The card resolves the
   * remix-contest event (end date, prize info) internally via useRemixContest.
   */
  trackId: ID
  variant?: ContestCardVariant
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
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
        color='default'
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
          <Skeleton h={28} w='80%' />
          <Flex gap='s'>
            <Skeleton h={22} w={72} />
            <Skeleton h={22} w={120} />
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
    const { imageUrl } = useTrackCoverArt({
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

    const permalink = track?.permalink ?? ''
    const handleNavigate = useLinkClickHandler<HTMLDivElement>(permalink)
    const handleClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        onClick?.(e)
        if (permalink) handleNavigate(e)
      },
      [handleNavigate, onClick, permalink]
    )

    if (!track || !user || !remixContest) {
      return <ContestCardSkeleton variant={variant} {...other} />
    }

    const prizeInfo = remixContest.eventData?.prizeInfo
    const status = formatStatus(remixContest.endDate)

    return (
      <Paper
        ref={ref}
        role='button'
        tabIndex={0}
        onClick={handleClick}
        direction='column'
        border='default'
        shadow='mid'
        w='100%'
        css={{ overflow: 'hidden', borderRadius: 14, cursor: 'pointer' }}
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
                size='s'
                color='subdued'
                strength='strong'
                css={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {messages.hostedBy}
              </Text>
              <UserLink userId={user.user_id} size='l' ellipses />
            </Flex>
          </Flex>

          <Divider orientation='horizontal' />

          <Flex direction='column' gap='s'>
            <Text
              variant='heading'
              size={variant === 'hero' ? 'l' : 'm'}
              ellipses
            >
              {track.title}
            </Text>
            <Flex
              gap='s'
              wrap='nowrap'
              onClick={(e) => e.stopPropagation()}
              css={{
                overflowX: 'auto',
                overflowY: 'hidden',
                minWidth: 0,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': { display: 'none' }
              }}
            >
              <CardPill>{messages.entries(entriesCount)}</CardPill>
              {prizeInfo ? (
                <CardPill>{messages.prizesAvailable}</CardPill>
              ) : null}
            </Flex>
          </Flex>
        </Flex>
      </Paper>
    )
  }
)
