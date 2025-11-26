import { useCallback, ReactElement } from 'react'

import { BadgeTier } from '@audius/common/models'
import { route, Nullable } from '@audius/common/utils'
import {
  Button,
  Flex,
  Modal,
  ModalContent,
  ModalContentText,
  ModalHeader,
  ModalTitle,
  IconArrowRight as IconArrow,
  IconTokenBronze,
  IconTokenGold,
  IconTokenPlatinum,
  IconTokenSilver
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { BadgeTierText } from 'components/user-badges/ProfilePageBadge'
import { useProfileTier } from 'hooks/wallet'
import { TierLevel, TierNumber } from 'pages/rewards-page/Tiers'
import { push } from 'utils/navigation'

import styles from './TierExplainerModal.module.css'

const { REWARDS_PAGE } = route

export const messages = {
  title: '$AUDIO VIP Tiers',
  desc1: 'Unlock $AUDIO VIP Tiers by simply holding more $AUDIO.',
  desc2:
    'Advancing to a new tier will earn you a profile badge, visible throughout the app, and unlock various new features, as they are released.',
  learnMore: 'LEARN MORE',
  currentTier: 'CURRENT TIER'
}

const BADGE_SIZE = 108

type AudioTiers = Exclude<BadgeTier, 'none'>

const audioTierMapSvg: {
  [tier in AudioTiers]: Nullable<ReactElement>
} = {
  bronze: <IconTokenBronze width={BADGE_SIZE} height={BADGE_SIZE} />,
  silver: <IconTokenSilver width={BADGE_SIZE} height={BADGE_SIZE} />,
  gold: <IconTokenGold width={BADGE_SIZE} height={BADGE_SIZE} />,
  platinum: <IconTokenPlatinum width={BADGE_SIZE} height={BADGE_SIZE} />
}

type TierProps = {
  isActive?: boolean
  tier: AudioTiers
  isCompact?: boolean
}

/** Shows info about a tier - badge, level, tier # */
const Tier = ({ tier, isActive = false, isCompact = false }: TierProps) => {
  const badgeImage = audioTierMapSvg[tier]

  return (
    <div
      className={cn(styles.tierContainerWrapper, {
        [styles.tierContainerActive]: isActive,
        [styles.compact]: isCompact
      })}
    >
      {isActive && (
        <div className={styles.currentTier}>
          {messages.currentTier}
          <div className={styles.arrowWrapper}>
            <IconArrow />
          </div>
        </div>
      )}
      <div
        className={cn(
          styles.tierContainer,
          {
            [styles.tierContainerActive]: isActive
          },
          {
            [styles.compact]: isCompact
          }
        )}
      >
        <TierNumber tier={tier} />
        <BadgeTierText
          tier={tier}
          fontSize={28}
          className={styles.badgeTierText}
        />
        <TierLevel tier={tier} />
        <div className={styles.divider} />
        <div className={styles.imageWrapper}>{badgeImage}</div>
      </div>
    </div>
  )
}

const TierExplainerModal = () => {
  const dispatch = useDispatch()
  const tier = useProfileTier()

  const [isOpen, setIsOpen] = useModalState('TiersExplainer')

  const handleDismiss = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const onClickLearnMore = useCallback(() => {
    handleDismiss()
    // Audio page removed - redirect to rewards page instead
    dispatch(push(REWARDS_PAGE))
  }, [dispatch, handleDismiss])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      dismissOnClickOutside
      size='medium'
    >
      <ModalHeader>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <Flex alignItems='center'>
          <Flex direction='column' gap='l' alignItems='flex-start' flex={3}>
            <ModalContentText>
              {messages.desc1}
              <br />
              <br />
              {messages.desc2}
            </ModalContentText>
            <Button variant='primary' onClick={onClickLearnMore}>
              {messages.learnMore}
            </Button>
          </Flex>
          <Flex flex={2}>
            <Tier isCompact tier={tier} />
          </Flex>
        </Flex>
      </ModalContent>
    </Modal>
  )
}

export default TierExplainerModal
