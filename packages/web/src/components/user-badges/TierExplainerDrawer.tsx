import { ReactElement, useCallback } from 'react'

import { BadgeTier } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  IconTokenBronze,
  IconTokenGold,
  IconTokenPlatinum,
  IconTokenSilver
} from '@audius/harmony'

import { useModalState } from 'common/hooks/useModalState'
import Drawer from 'components/drawer/Drawer'
import { useProfileTier } from 'hooks/wallet'
import { TierLevel, TierNumber } from 'pages/rewards-page/Tiers'

import { BadgeTierText } from './ProfilePageBadge'
import styles from './TierExplainerDrawer.module.css'
import { messages } from './TierExplainerModal'

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

const TierExplainerDrawer = () => {
  const [isOpen, setIsOpen] = useModalState('TiersExplainer')

  const onClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const tier = useProfileTier()

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className={styles.drawer}>
        <div className={styles.top}>
          {audioTierMapSvg[tier]}
          <div className={styles.topText}>
            <TierNumber tier={tier} />
            <BadgeTierText
              tier={tier}
              fontSize={28}
              className={styles.badgeColoredText}
            />
            <TierLevel tier={tier} />
          </div>
        </div>
        <div className={styles.textContainer}>
          {messages.desc1}
          <br />
          <br />
          {messages.desc2}
        </div>
      </div>
    </Drawer>
  )
}

export default TierExplainerDrawer
