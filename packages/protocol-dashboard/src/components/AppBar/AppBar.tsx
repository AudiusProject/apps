import React, { ReactNode, useCallback, useEffect, useState } from 'react'

import {
  Box,
  Flex,
  Button as HarmonyButton,
  HarmonyTheme,
  IconAudiusLogoHorizontal,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony'
import { IconLink } from '@audius/stems'
import {
  useWeb3Modal,
  useWeb3ModalState,
  createWeb3Modal,
  useDisconnect,
  useWeb3ModalAccount,
  useWeb3ModalProvider
} from '@web3modal/ethers/react'
import clsx from 'clsx'

import Button from 'components/Button'
import { ConnectAudiusProfileModal } from 'components/ConnectAudiusProfileModal/ConnectAudiusProfileModal'
import UserImage from 'components/UserImage'
import UserBadges from 'components/UserInfo/AudiusProfileBadges'
import { useDashboardWalletUser } from 'hooks/useDashboardWalletUsers'
import { resolveAccountConnected } from 'services/Audius/setup'
import { useAccount } from 'store/account/hooks'
import { useUser } from 'store/cache/user/hooks'
import { Address, Status } from 'types'
import { usePushRoute } from 'utils/effects'
import { CHAIN_INFO, ETHERS_CONFIG } from 'utils/eth'
import { formatShortWallet } from 'utils/format'
import { useIsMobile, useModalControls } from 'utils/hooks'
import { createStyles } from 'utils/mobile'
import { accountPage } from 'utils/routes'

import MisconfiguredModal from '../ConnectMetaMaskModal/MisconfiguredModal'

import desktopStyles from './AppBar.module.css'
import mobileStyles from './AppBarMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const projectId = import.meta.env.VITE_WEB3MODAL_PROJECT_ID

createWeb3Modal({
  ethersConfig: ETHERS_CONFIG,
  chains: [CHAIN_INFO],
  projectId,
  enableAnalytics: false
})

const messages = {
  title: 'AUDIUS',
  name: 'Protocol Dashboard',
  launchApp: 'LAUNCH THE APP',
  walletMisconfigured: 'Wallet Misconfigured',
  block: 'Block',
  wallet: 'WALLET',
  staked: 'STAKED',
  profileAlt: 'User Profile',
  connectProfile: 'Connect Audius Profile',
  loading: 'Loading Account...',
  connectWallet: 'Connect Wallet',
  connecting: 'Connecting...',
  disconnect: 'Disconnect'
}

type UserAccountSnippetProps = { wallet: Address }

type ConnectWalletProps = {
  isMisconfigured: boolean
}
const ConnectWallet = ({ isMisconfigured }: ConnectWalletProps) => {
  const { open: openWeb3Modal } = useWeb3Modal()
  const { open: isWeb3ModalOpen } = useWeb3ModalState()

  const [isMisconfiguredModalOpen, setIsMisconfiguredModalOpen] =
    useState(false)
  const onClick = useCallback(
    () => setIsMisconfiguredModalOpen(true),
    [setIsMisconfiguredModalOpen]
  )
  const onClose = useCallback(
    () => setIsMisconfiguredModalOpen(false),
    [setIsMisconfiguredModalOpen]
  )

  return isMisconfigured ? (
    <>
      <div
        onClick={onClick}
        className={clsx(styles.connectWalletContainer, styles.cursorPointer)}
      >
        <div className={styles.misconfiguredDot}></div>
        <div className={styles.connectText}>{messages.walletMisconfigured}</div>
      </div>
      <MisconfiguredModal isOpen={isMisconfiguredModalOpen} onClose={onClose} />
    </>
  ) : (
    <HarmonyButton
      variant='tertiary'
      size='small'
      isLoading={isWeb3ModalOpen}
      onClick={() => openWeb3Modal()}
    >
      {isWeb3ModalOpen ? messages.connecting : messages.connectWallet}
    </HarmonyButton>
  )
}

const LoadingAccount = () => {
  return (
    <div className={styles.connectWalletContainer}>
      <div className={clsx(styles.connectText, styles.loadingText)}>
        {messages.loading}
      </div>
    </div>
  )
}

const DisconnectButton = () => {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const { disconnect } = useDisconnect()

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true)
    await disconnect()
  }, [disconnect])

  return (
    <PlainButton
      variant='inverted'
      css={({ spacing }: HarmonyTheme) => ({
        marginRight: -spacing.xs
      })}
      onClick={handleDisconnect}
      disabled={isDisconnecting}
    >
      {messages.disconnect}
    </PlainButton>
  )
}

const UserAccountSnippet = ({ wallet }: UserAccountSnippetProps) => {
  const { user, audiusProfile, status } = useUser({ wallet })
  const pushRoute = usePushRoute()
  const onClickUser = useCallback(() => {
    if (user) {
      pushRoute(accountPage(user.wallet))
    }
  }, [user, pushRoute])

  if (status === Status.Loading) {
    return <LoadingAccount />
  }
  if (!user) return null

  return (
    <Flex direction='column' alignItems='flex-end'>
      <div className={styles.snippetContainer} onClick={onClickUser}>
        <div className={styles.user}>
          <UserImage
            wallet={user.wallet}
            imgClassName={styles.snippetImg}
            alt={messages.profileAlt}
            useSkeleton={false}
          />
          {audiusProfile != null ? null : (
            <Flex direction='column' alignItems='flex-end' gap='xs'>
              <div className={styles.walletText}>
                {formatShortWallet(user.wallet)}
              </div>
              <DisconnectButton />
            </Flex>
          )}
        </div>
        {audiusProfile == null ? null : (
          <div className={styles.userNameContainer}>
            <div className={styles.userNameText}>
              {audiusProfile.name}{' '}
              <UserBadges inline audiusProfile={audiusProfile} badgeSize={14} />
            </div>
            <div className={styles.walletText}>
              {formatShortWallet(user.wallet)}
            </div>
          </div>
        )}
      </div>
      {audiusProfile == null ? null : <DisconnectButton />}
    </Flex>
  )
}

const ConnectAudiusProfileButton = ({
  wallet,
  walletProvider
}: {
  wallet: string
  walletProvider?: any
}) => {
  const { isOpen, onClick, onClose } = useModalControls()
  return (
    <>
      <Button
        onClick={onClick}
        className={styles.launchAppBtn}
        textClassName={styles.launchAppBtnText}
        text={messages.connectProfile}
        leftIcon={<IconLink width={16} height={16} />}
        iconClassName={styles.launchAppBtnIcon}
      />
      <ConnectAudiusProfileModal
        action='connect'
        wallet={wallet}
        walletProvider={walletProvider}
        isOpen={isOpen}
        onClose={onClose}
      />
    </>
  )
}

type AppBarProps = {}
const AppBar: React.FC<AppBarProps> = () => {
  const isMobile = useIsMobile()
  const { isLoggedIn, wallet } = useAccount()
  const { spacing, color } = useTheme() as HarmonyTheme // Need to cast because the type from import is incorrect
  const [isAudiusClientSetup, setIsAudiusClientSetup] = useState(false)
  const [isMisconfigured, setIsMisconfigured] = useState(false)

  const [isAccountMisconfigured, setIsAccountMisconfigured] = useState(false)
  const { data: audiusProfileData, status: audiusProfileDataStatus } =
    useDashboardWalletUser(wallet)
  const hasConnectedAudiusAccount = audiusProfileData != null

  const { isConnected } = useWeb3ModalAccount()
  const { walletProvider } = useWeb3ModalProvider()

  useEffect(() => {
    if (isConnected) {
      resolveAccountConnected(walletProvider)
    }
  }, [isConnected, walletProvider])

  const waitForSetup = async () => {
    await window.aud.walletAccountLoadedPromise
    setIsAudiusClientSetup(true)
    setIsMisconfigured(window.aud.isMisconfigured)
    setIsAccountMisconfigured(window.aud.isAccountMisconfigured)
  }

  useEffect(() => {
    waitForSetup()
  }, [])

  let accountSnippetContent: ReactNode
  let isAccountSnippetContentClickable: boolean
  if (
    !isConnected ||
    (isAudiusClientSetup && (isMisconfigured || isAccountMisconfigured))
  ) {
    isAccountSnippetContentClickable = true
    accountSnippetContent = (
      <ConnectWallet
        isMisconfigured={isMisconfigured || isAccountMisconfigured}
      />
    )
  } else if (isLoggedIn && wallet) {
    isAccountSnippetContentClickable = true
    accountSnippetContent = <UserAccountSnippet wallet={wallet} />
  } else if (!isAudiusClientSetup) {
    isAccountSnippetContentClickable = false
    accountSnippetContent = <LoadingAccount />
  } else {
    isAccountSnippetContentClickable = false
    accountSnippetContent = null
  }

  return (
    <div className={styles.appBar}>
      <div className={styles.left}>
        <IconAudiusLogoHorizontal color='inverse' className={styles.logo} />
        {isMobile ? null : (
          <Box
            h={spacing['2xl']}
            css={{
              borderRight: `solid 1px ${color.static.white}`,
              opacity: '80%'
            }}
          />
        )}
        <div className={styles.name}>
          <Text variant='heading' size='s' strength='default' color='inverse'>
            {messages.name}
          </Text>
        </div>
      </div>
      {!isMobile && (
        <div className={styles.right}>
          {hasConnectedAudiusAccount ||
          !wallet ||
          !isLoggedIn ||
          audiusProfileDataStatus === 'pending' ? null : (
            <ConnectAudiusProfileButton wallet={wallet} walletProvider={walletProvider} />
          )}
          <div
            className={clsx({
              [styles.cursorPointer]: isAccountSnippetContentClickable
            })}
          >
            {accountSnippetContent}
          </div>
        </div>
      )}
    </div>
  )
}

export default AppBar
