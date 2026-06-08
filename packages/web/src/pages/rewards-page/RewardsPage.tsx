import { ReactNode, useContext, useEffect } from 'react'

import { StringKeys } from '@audius/common/services'
import { route } from '@audius/common/utils'
import { IconGift } from '@audius/harmony'

import { Header } from 'components/header/desktop/Header'
import { useMobileHeader } from 'components/header/mobile/hooks'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { useRemoteVar } from 'hooks/useRemoteConfig'
import { BASE_URL } from 'utils/route'

import styles from './RewardsPage.module.css'
import Tiers from './Tiers'
import { ChallengeRewardsTile } from './components/ChallengeRewards/ChallengeRewardsTile'
const { REWARDS_PAGE } = route

const messages = {
  title: 'Rewards & Perks',
  description: 'Earn $AUDIO by completing simple tasks while using Audius'
}

const RewardsContent = () => {
  const audioFeaturesDegradedText = useRemoteVar(
    StringKeys.AUDIO_FEATURES_DEGRADED_TEXT
  )

  return (
    <>
      {audioFeaturesDegradedText ? (
        <div className={styles.topBanner}>
          <span className={styles.topBannerText}>
            {audioFeaturesDegradedText}
          </span>
        </div>
      ) : null}
      <ChallengeRewardsTile className={styles.mobile} />
      <Tiers />
    </>
  )
}

const DesktopPage = ({ children }: { children: ReactNode }) => {
  const header = <Header icon={IconGift} primary={messages.title} />
  return (
    <Page
      title={messages.title}
      description={messages.description}
      contentClassName={styles.pageContainer}
      header={header}
    >
      {children}
    </Page>
  )
}

const useMobileNavContext = () => {
  useMobileHeader({ title: messages.title })
  const { setLeft, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setRight(RightPreset.KEBAB)
  }, [setLeft, setRight])
}

const MobilePage = ({ children }: { children: ReactNode }) => {
  useMobileNavContext()
  return (
    <MobilePageContainer
      title={messages.title}
      description={messages.description}
      canonicalUrl={`${BASE_URL}${REWARDS_PAGE}`}
      hasDefaultHeader
      containerClassName={styles.rewardsMobilePageContainer}
    >
      {children}
    </MobilePageContainer>
  )
}

export const RewardsPage = () => {
  const isMobile = useIsMobile()
  const Page = isMobile ? MobilePage : DesktopPage
  return (
    <Page>
      <RewardsContent />
    </Page>
  )
}
