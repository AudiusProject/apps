import { useMemo } from 'react'

import {
  useArtistCreatedFanClub,
  useCurrentAccountUser,
  useCurrentUserId,
  useTrack,
  useUserRemixContests
} from '@audius/common/api'
import { useChallengeCooldownSchedule, useIsArtist } from '@audius/common/hooks'
import { formatNumberCommas, route } from '@audius/common/utils'
import {
  Flex,
  IconCloudUpload,
  IconDiscord,
  IconFanClub,
  IconGift,
  IconQuestionCircle,
  IconTrophy,
  IconUser,
  IconVerified,
  Paper,
  Text,
  useTheme
} from '@audius/harmony'
import { GetContestsByUserStatusEnum } from '@audius/sdk'
import { useNavigate } from 'react-router'

import { useIsMobile } from 'hooks/useIsMobile'

const {
  AUDIUS_DISCORD_LINK,
  AUDIUS_HELP_LINK,
  CHECK_PAGE,
  CLUBS_CREATE_PAGE,
  CONTESTS_PAGE,
  HOST_REMIX_CONTEST_ROOT_PAGE,
  REWARDS_PAGE,
  SIGN_UP_PAGE,
  UPLOAD_PAGE,
  clubPage,
  profilePage
} = route

const messages = {
  hostContest: 'Host a Contest',
  manageContest: 'Manage Contest',
  manageMultipleContests: 'Manage Contests',
  launchFanClub: 'Launch a Fan Club',
  manageFanClub: 'Manage Fan Club',
  uploadTrack: 'Upload',
  yourProfile: 'Your Profile',
  getVerified: 'Get Verified',
  joinDiscord: 'Discord',
  support: 'Support',
  signUp: 'Sign Up',
  rewards: 'Rewards',
  audioUnit: '$AUDIO'
}

type Pill = {
  key: string
  label: string
  icon: React.ComponentType<any>
  href?: string
  to?: string
  external?: boolean
  highlight?: boolean
}

const PillItem = ({ pill }: { pill: Pill }) => {
  const navigate = useNavigate()
  const { color } = useTheme()
  const onClick = () => {
    if (pill.external && pill.href) {
      window.open(pill.href, '_blank', 'noopener,noreferrer')
      return
    }
    if (pill.to) navigate(pill.to)
  }
  return (
    <Paper
      onClick={onClick}
      pv='s'
      ph='m'
      gap='xs'
      direction='row'
      alignItems='center'
      backgroundColor={pill.highlight ? 'accent' : 'white'}
      border='default'
      borderRadius='circle'
      css={{
        flexShrink: 0,
        cursor: 'pointer',
        '&:hover': { background: color.neutral.n25 }
      }}
    >
      <pill.icon size='s' color={pill.highlight ? 'staticWhite' : 'default'} />
      <Text
        variant='label'
        size='s'
        color={pill.highlight ? 'staticWhite' : 'default'}
      >
        {pill.label}
      </Text>
    </Paper>
  )
}

export const QuickLinks = () => {
  const isMobile = useIsMobile()
  const { data: currentUserId } = useCurrentUserId()
  const { data: currentUser } = useCurrentAccountUser()
  const isAuthed = !!currentUserId

  const { claimableAmount, isEmpty: isRewardsEmpty } =
    useChallengeCooldownSchedule({ multiple: true })

  const { data: hostedContestTrackIds } = useUserRemixContests(
    {
      userId: currentUserId,
      status: GetContestsByUserStatusEnum.Active
    },
    { enabled: isAuthed }
  )
  const singleHostedTrackId =
    hostedContestTrackIds?.length === 1 ? hostedContestTrackIds[0] : null
  const { data: hostedTrack } = useTrack(singleHostedTrackId ?? undefined)

  const { data: createdFanClub } = useArtistCreatedFanClub(currentUserId, {
    enabled: isAuthed
  })

  const isArtist = useIsArtist({ id: currentUserId ?? undefined })
  const isVerified = !!currentUser?.is_verified
  const currentUserHandle = currentUser?.handle

  const pills = useMemo<Pill[]>(() => {
    if (!isAuthed) {
      return [
        {
          key: 'discord',
          label: messages.joinDiscord,
          icon: IconDiscord,
          href: AUDIUS_DISCORD_LINK,
          external: true
        },
        {
          key: 'support',
          label: messages.support,
          icon: IconQuestionCircle,
          href: AUDIUS_HELP_LINK,
          external: true
        },
        {
          key: 'signup',
          label: messages.signUp,
          icon: IconUser,
          to: SIGN_UP_PAGE
        }
      ]
    }

    const items: Pill[] = []

    const hasClaimable = !isRewardsEmpty && claimableAmount > 0
    items.push({
      key: 'rewards',
      label: hasClaimable
        ? `${formatNumberCommas(claimableAmount)} ${messages.audioUnit}`
        : messages.rewards,
      icon: IconGift,
      to: REWARDS_PAGE,
      highlight: hasClaimable
    })

    items.push({
      key: 'upload',
      label: messages.uploadTrack,
      icon: IconCloudUpload,
      to: UPLOAD_PAGE
    })

    if (currentUserHandle) {
      items.push({
        key: 'your-profile',
        label: messages.yourProfile,
        icon: IconUser,
        to: profilePage(currentUserHandle)
      })
    }

    const hostedCount = hostedContestTrackIds?.length ?? 0
    if (hostedCount === 0) {
      // Only artists can host a contest — non-artists never see the empty CTA.
      if (isArtist) {
        items.push({
          key: 'host-contest',
          label: messages.hostContest,
          icon: IconTrophy,
          to: HOST_REMIX_CONTEST_ROOT_PAGE
        })
      }
    } else if (hostedCount === 1 && hostedTrack?.permalink) {
      items.push({
        key: 'manage-contest',
        label: messages.manageContest,
        icon: IconTrophy,
        to: hostedTrack.permalink
      })
    } else {
      items.push({
        key: 'manage-contests',
        label: messages.manageMultipleContests,
        icon: IconTrophy,
        to: CONTESTS_PAGE
      })
    }

    if (createdFanClub?.ticker) {
      items.push({
        key: 'manage-fan-club',
        label: messages.manageFanClub,
        icon: IconFanClub,
        to: clubPage(createdFanClub.ticker)
      })
    } else if (isVerified) {
      items.push({
        key: 'launch-fan-club',
        label: messages.launchFanClub,
        icon: IconFanClub,
        to: CLUBS_CREATE_PAGE
      })
    }

    if (!isVerified) {
      items.push({
        key: 'verify',
        label: messages.getVerified,
        icon: IconVerified,
        to: CHECK_PAGE
      })
    }

    items.push(
      {
        key: 'discord',
        label: messages.joinDiscord,
        icon: IconDiscord,
        href: AUDIUS_DISCORD_LINK,
        external: true
      },
      {
        key: 'support',
        label: messages.support,
        icon: IconQuestionCircle,
        href: AUDIUS_HELP_LINK,
        external: true
      }
    )

    return items
  }, [
    isAuthed,
    isRewardsEmpty,
    claimableAmount,
    hostedContestTrackIds,
    hostedTrack,
    createdFanClub,
    isArtist,
    isVerified,
    currentUserHandle
  ])

  return (
    <Flex
      w='100%'
      pv='s'
      css={{
        overflowX: 'auto',
        overflowY: 'hidden',
        minWidth: 0,
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
      }}
    >
      <Flex
        gap='s'
        ph={isMobile ? 'l' : undefined}
        css={{ minWidth: 'max-content' }}
      >
        {pills.map((pill) => (
          <PillItem key={pill.key} pill={pill} />
        ))}
      </Flex>
    </Flex>
  )
}
