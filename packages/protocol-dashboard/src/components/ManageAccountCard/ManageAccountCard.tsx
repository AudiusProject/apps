import { useCallback } from 'react'

import { Box, Flex, Text } from '@audius/harmony'

import { Card } from 'components/Card/Card'
import {
  DelegatedAudioInfoTooltip,
  DelegatingToInfoTooltip,
  EstimatedAudioRewardInfoTooltip
} from 'components/InfoTooltip/InfoTooltips'
import Loading from 'components/Loading'
import { ManageDelegation } from 'components/UpdateDelegationModal/UpdateDelegationModal'
import UserImage from 'components/UserImage'
import UserBadges from 'components/UserInfo/AudiusProfileBadges'
import AudiusClient from 'services/Audius/AudiusClient'
import { useAccount } from 'store/account/hooks'
import {
  useUserAnnualRewardRate,
  useUserWeeklyRewards
} from 'store/cache/rewards/hooks'
import { useUser, useUserDelegates } from 'store/cache/user/hooks'
import { Address, Status } from 'types'
import { TICKER } from 'utils/consts'
import { usePushRoute } from 'utils/effects'
import { formatShortWallet } from 'utils/format'
import { accountPage } from 'utils/routes'

import styles from './ManageAccountCard.module.css'

const messages = {
  estimatedReward: `Estimated ${TICKER} Reward`,
  delegatingTo: 'Delegating To',
  weekly: 'Weekly',
  annual: 'Annual',
  delegatedToken: `Delegated ${TICKER}`,
  profileAlt: 'User Profile',
  manage: 'Manage'
}

type DelegateInfoProps = {
  wallet: Address
  longFormat?: boolean
  clickable?: boolean
}

export const DelegateInfo = ({
  wallet,
  longFormat = false,
  clickable = true
}: DelegateInfoProps) => {
  const { user, audiusProfile } = useUser({ wallet })
  const pushRoute = usePushRoute()
  const onClickUser = useCallback(() => {
    if (user) {
      pushRoute(accountPage(user.wallet))
    }
  }, [user, pushRoute])

  if (!user) return null

  return (
    <Flex
      gap='s'
      onClick={clickable ? onClickUser : undefined}
      css={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <Flex gap='s' alignItems='center'>
        <UserImage
          wallet={wallet}
          imgClassName={styles.snippetImg}
          alt={messages.profileAlt}
          useSkeleton={false}
        />
        {audiusProfile != null ? null : (
          <Text variant='body' size='m' strength='strong'>
            {formatShortWallet(user.wallet)}
          </Text>
        )}
      </Flex>
      {audiusProfile == null ? null : (
        <Flex direction='column' gap='xs'>
          <Flex gap='xs' alignItems='center'>
            <Text variant='heading' size='s' strength='default' tag='span'>
              {audiusProfile.name}
            </Text>
            <UserBadges inline audiusProfile={audiusProfile} badgeSize={14} />
          </Flex>
          <Box>
            <Text
              variant='body'
              size='m'
              strength='strong'
              color={longFormat ? 'subdued' : 'default'}
            >
              {longFormat ? user.wallet : formatShortWallet(user.wallet)}
            </Text>
          </Box>
        </Flex>
      )}
    </Flex>
  )
}

type UserAudioRewardEstimateProps = {
  wallet: Address
  delegateAddress?: string
}
const UserAudioRewardEstimate = ({
  wallet,
  delegateAddress
}: UserAudioRewardEstimateProps) => {
  const weeklyRewards = useUserWeeklyRewards({ wallet })
  const annualRewards = useUserAnnualRewardRate({ wallet })
  const isLoading =
    weeklyRewards.status === Status.Loading ||
    annualRewards.status === Status.Loading
  const annual = delegateAddress
    ? annualRewards.delegateToUserRewards?.[delegateAddress]
    : annualRewards.reward
  const annualFormatted =
    annualRewards.status === Status.Loading
      ? null
      : AudiusClient.displayShortAud(annual)

  const weekly =
    'reward' in weeklyRewards
      ? delegateAddress
        ? weeklyRewards.delegateToUserRewards?.[delegateAddress]
        : weeklyRewards.reward
      : null

  const weeklyFormatted =
    weeklyRewards.status === Status.Loading
      ? null
      : AudiusClient.displayShortAud(weekly)

  if (isLoading) {
    return <Loading />
  }

  return (
    <Flex mt='l' direction='column' gap='s'>
      <Flex gap='s'>
        <Text variant='heading' size='s' strength='default' tag='span'>
          {weeklyFormatted}
        </Text>
        <Text variant='heading' color='subdued' size='s' strength='default'>
          {messages.weekly}
        </Text>
      </Flex>
      <Flex gap='s'>
        <Text variant='heading' size='s' strength='default' tag='span'>
          {annualFormatted}
        </Text>
        <Text variant='heading' color='subdued' size='s' strength='default'>
          {messages.annual}
        </Text>
      </Flex>
    </Flex>
  )
}

type ManageAccountCardProps = {
  wallet: string
}

type ManageDelegationContainerProps = { nodeWallet: string }

const ManageDelegationContainer = ({
  nodeWallet
}: ManageDelegationContainerProps) => {
  const { status: userDelegatesStatus, delegates } = useUserDelegates({
    wallet: nodeWallet
  })
  if (userDelegatesStatus !== Status.Success || delegates.isZero()) {
    return null
  }
  return <ManageDelegation delegates={delegates} wallet={nodeWallet} />
}

export const ManageAccountCard = ({ wallet }: ManageAccountCardProps) => {
  const { isLoggedIn, wallet: currentUserWallet } = useAccount()

  const { user } = useUser({ wallet })
  const isOwner = currentUserWallet === wallet
  const delegate = user?.delegates?.[0]

  if (!isLoggedIn || !user || !delegate) {
    return null
  }

  return (
    <>
      {user?.delegates?.map((d) => {
        return (
          <Card
            key={d.wallet}
            pv='l'
            ph='xl'
            justifyContent='space-between'
            alignItems='center'
            gap='2xl'
            wrap='wrap'
          >
            <Card direction='column' pv='l' ph='xl'>
              <Flex inline gap='xs' alignItems='center'>
                <Text
                  variant='heading'
                  color='subdued'
                  size='s'
                  strength='default'
                >
                  {messages.delegatingTo}
                </Text>
                <DelegatingToInfoTooltip color='subdued' />
              </Flex>
              <Box mt='l'>
                <DelegateInfo wallet={d.wallet} />
              </Box>
            </Card>
            <Box css={{ flexGrow: 1 }}>
              <Flex inline gap='xs' alignItems='center'>
                <Text
                  variant='heading'
                  color='subdued'
                  size='s'
                  strength='default'
                >
                  {messages.estimatedReward}
                </Text>
                <EstimatedAudioRewardInfoTooltip color='subdued' />
              </Flex>
              <Box mt='l'>
                <UserAudioRewardEstimate
                  wallet={wallet}
                  delegateAddress={d.wallet}
                />
              </Box>
            </Box>
            <Box css={{ maxWidth: 226, flexGrow: 1 }}>
              <Flex direction='column' alignItems='flex-end'>
                <Text
                  variant='heading'
                  size='m'
                  strength='default'
                  color='accent'
                >
                  {AudiusClient.displayShortAud(d.amount)}
                </Text>
                <Flex inline gap='xs' alignItems='center'>
                  <Text
                    variant='heading'
                    color='subdued'
                    size='s'
                    strength='default'
                  >
                    {messages.delegatedToken}
                  </Text>
                  <DelegatedAudioInfoTooltip color='subdued' />
                </Flex>
              </Flex>
              {isOwner ? (
                <Box mt='unit5'>
                  <ManageDelegationContainer nodeWallet={d.wallet} />
                </Box>
              ) : null}
            </Box>
          </Card>
        )
      })}
    </>
  )
}
