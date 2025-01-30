import { ReactNode, useContext, useEffect } from 'react'

import { StringKeys } from '@audius/common/services'
import { tokenDashboardPageActions, walletActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { Header } from 'components/header/desktop/Header'
import { useMobileHeader } from 'components/header/mobile/hooks'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import Page from 'components/page/Page'
import { HCaptchaModal } from 'components/rewards/modals/HCaptchaModal'
import { useIsMobile } from 'hooks/useIsMobile'
import { useRemoteVar } from 'hooks/useRemoteConfig'
import { useRequiresAccount } from 'hooks/useRequiresAccount'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'
import { ClaimAllRewardsPanel } from 'pages/rewards-page/components/ClaimAllRewardsPanel'
import { BASE_URL } from 'utils/route'

import styles from './AudioPage.module.css'
import { AudioWalletTransactions } from './AudioWalletTransactions'
import WalletModal from './WalletModal'
import ExplainerTile from './components/ExplainerTile'
import { WalletManagementTile } from './components/WalletManagementTile'
const { AUDIO_PAGE, TRENDING_PAGE } = route
const { getBalance } = walletActions
const { preloadWalletProviders } = tokenDashboardPageActions

const messages = {
  title: '$AUDIO Wallet',
  description: 'Complete tasks to earn $AUDIO tokens!'
}

const RewardsContent = () => {
  const wm = useWithMobileStyle(styles.mobile)

  const audioFeaturesDegradedText = useRemoteVar(
    StringKeys.AUDIO_FEATURES_DEGRADED_TEXT
  )

  useRequiresAccount(TRENDING_PAGE)

  return (
    <Flex column gap='2xl'>
      <WalletModal />
      {audioFeaturesDegradedText ? (
        <div className={styles.topBanner}>
          <span className={styles.topBannerText}>
            {audioFeaturesDegradedText}
          </span>
        </div>
      ) : null}
      <ClaimAllRewardsPanel />
      <WalletManagementTile />
      <AudioWalletTransactions />
      <ExplainerTile className={wm(styles.explainerTile)} />
    </Flex>
  )
}

const DesktopPage = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(preloadWalletProviders())
  }, [dispatch])
  const header = <Header primary={messages.title} />
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
    setRight(RightPreset.SEARCH)
  }, [setLeft, setRight])
}

const MobilePage = ({ children }: { children: ReactNode }) => {
  useMobileNavContext()
  return (
    <MobilePageContainer
      title={messages.title}
      description={messages.description}
      canonicalUrl={`${BASE_URL}${AUDIO_PAGE}`}
      hasDefaultHeader
      containerClassName={styles.rewardsMobilePageContainer}
    >
      {children}
    </MobilePageContainer>
  )
}

export const AudioPage = () => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  useEffect(() => {
    dispatch(getBalance())
  }, [dispatch])
  const Page = isMobile ? MobilePage : DesktopPage
  return (
    <Page>
      <RewardsContent />
    </Page>
  )
}
