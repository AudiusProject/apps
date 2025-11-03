import { useCallback } from 'react'

import {
  formatCooldownChallenges,
  useChallengeCooldownSchedule
} from '@audius/common/hooks'
import {
  Box,
  Button,
  Flex,
  IconArrowRight as IconArrow,
  IconTokenGold,
  Paper,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony'

import { useModalState } from 'common/hooks/useModalState'
import { useIsMobile } from 'hooks/useIsMobile'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'

import styles from '../RewardsTile.module.css'
import { messages } from '../messages'

export const ClaimAllRewardsPanel = () => {
  const isMobile = useIsMobile() || window.innerWidth < 1080
  const wm = useWithMobileStyle(styles.mobile)
  const { cooldownChallenges, cooldownAmount, claimableAmount, isEmpty } =
    useChallengeCooldownSchedule({ multiple: true })
  const claimable = claimableAmount > 0
  const [, setClaimAllRewardsVisibility] = useModalState('ClaimAllRewards')
  const { iconSizes } = useTheme()

  const onClickClaimAllRewards = useCallback(() => {
    setClaimAllRewardsVisibility(true)
  }, [setClaimAllRewardsVisibility])

  const onClickMoreInfo = useCallback(() => {
    setClaimAllRewardsVisibility(true)
  }, [setClaimAllRewardsVisibility])

  const handleClick = useCallback(() => {
    if (claimable) {
      onClickClaimAllRewards()
    } else if (cooldownAmount > 0) {
      onClickMoreInfo()
    }
  }, [claimable, cooldownAmount, onClickClaimAllRewards, onClickMoreInfo])

  if (isEmpty) return null

  if (isMobile) {
    return (
      <Paper
        border='strong'
        alignItems='center'
        alignSelf='stretch'
        justifyContent='space-between'
        css={{ cursor: 'pointer' }}
        onClick={handleClick}
        mt='l'
      >
        <Flex direction='column' alignItems='start' w='100%' p='l'>
          <Flex gap='s' alignItems='center'>
            {claimable ? (
              <IconTokenGold
                height={iconSizes.l}
                width={iconSizes.l}
                aria-label={messages.goldAudioToken}
              />
            ) : null}
            {isEmpty ? null : (
              <Text color='accent' variant='title' size='l'>
                {claimable
                  ? messages.totalReadyToClaim
                  : messages.totalUpcomingRewards}
              </Text>
            )}
          </Flex>
          {cooldownAmount > 0 ? (
            <Box
              mt='m'
              backgroundColor='default'
              pv='2xs'
              ph='s'
              borderRadius='l'
            >
              <Text color='accent' variant='body' size='s' strength='strong'>
                {messages.formatCooldownAmount(cooldownAmount)}
              </Text>
            </Box>
          ) : null}
          <Box mt='l' mb='xl'>
            <Text variant='body' textAlign='left' size='s'>
              {claimable
                ? messages.formatClaimableAmount(claimableAmount)
                : messages.availableMessage(
                    formatCooldownChallenges(cooldownChallenges)
                  )}
            </Text>
          </Box>
          {claimable ? (
            <Button
              onClick={onClickClaimAllRewards}
              iconRight={IconArrow}
              fullWidth
            >
              {messages.claimAllRewards}
            </Button>
          ) : cooldownAmount > 0 ? (
            <PlainButton
              size='large'
              onClick={onClickMoreInfo}
              iconRight={IconArrow}
              fullWidth
            >
              {messages.moreInfo}
            </PlainButton>
          ) : null}
        </Flex>
      </Paper>
    )
  }

  return (
    <Paper
      border='strong'
      p='xl'
      alignItems='center'
      alignSelf='stretch'
      justifyContent='space-between'
      css={{ cursor: 'pointer' }}
      onClick={handleClick}
    >
      <Flex gap='l' alignItems='center'>
        {claimableAmount > 0 ? (
          <IconTokenGold
            height={iconSizes['3xl']}
            width={iconSizes['3xl']}
            aria-label={messages.goldAudioToken}
          />
        ) : null}
        <Flex direction='column'>
          <Flex>
            {isEmpty ? null : (
              <Text color='accent' size='m' variant='heading'>
                {claimableAmount > 0
                  ? messages.totalReadyToClaim
                  : messages.totalUpcomingRewards}
              </Text>
            )}
            {cooldownAmount > 0 ? (
              <div className={wm(styles.pendingPillContainer)}>
                <span className={styles.pillMessage}>
                  {messages.formatCooldownAmount(cooldownAmount)}
                </span>
              </div>
            ) : null}
          </Flex>
          <Text variant='body' textAlign='left'>
            {claimableAmount > 0
              ? messages.formatClaimableAmount(claimableAmount)
              : messages.availableMessage(
                  formatCooldownChallenges(cooldownChallenges)
                )}
          </Text>
        </Flex>
      </Flex>
      {claimableAmount > 0 ? (
        <Button onClick={onClickClaimAllRewards} iconRight={IconArrow}>
          {messages.claimAllRewards}
        </Button>
      ) : cooldownAmount > 0 ? (
        <PlainButton
          size='large'
          onClick={onClickMoreInfo}
          iconRight={IconArrow}
        >
          {messages.moreInfo}
        </PlainButton>
      ) : null}
    </Paper>
  )
}
