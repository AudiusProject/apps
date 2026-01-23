import { useCallback, useContext, useEffect, useState, FC } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { Name, SquareSizes, Theme } from '@audius/common/models'
import {
  settingsPageActions,
  themeSelectors,
  themeActions,
  musicConfettiActions,
  useTierAndVerifiedForUser
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconVerified,
  Modal,
  ModalContent,
  ModalContentText,
  ModalFooter,
  SegmentedControl,
  Text,
  IconAudiusLogoHorizontalColor,
  IconLogoCircleUSDCPng
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router'

import { make } from 'common/store/analytics/actions'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import GroupableList from 'components/groupable-list/GroupableList'
import Grouping from 'components/groupable-list/Grouping'
import Row from 'components/groupable-list/Row'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'
import Page from 'components/page/Page'
import { useProfilePicture } from 'hooks/useProfilePicture'
import useScrollToTop from 'hooks/useScrollToTop'
import { isDarkMode } from 'utils/theme/theme'

import AboutSettingsPage from './AboutSettingsPage'
import AccountSettingsPage from './AccountSettingsPage'
import { ChangeEmailMobilePage } from './ChangeEmailPage'
import { ChangePasswordMobilePage } from './ChangePasswordPage'
import NotificationsSettingsPage from './NotificationsSettingsPage'
import styles from './SettingsPage.module.css'

const {
  getNotificationSettings: getNotificationSettingsAction,
  getPushNotificationSettings: getPushNotificationSettingsAction
} = settingsPageActions
const { setTheme } = themeActions
const { getTheme } = themeSelectors
const { show } = musicConfettiActions
const {
  ACCOUNT_SETTINGS_PAGE,
  HISTORY_PAGE,
  ABOUT_SETTINGS_PAGE,
  NOTIFICATION_SETTINGS_PAGE,
  PAYMENTS_PAGE
} = route

export enum SubPage {
  ACCOUNT = 'account',
  NOTIFICATIONS = 'notifications',
  ABOUT = 'about',
  CHANGE_PASSWORD = 'change password',
  CHANGE_EMAIL = 'change email'
}

const messages = {
  pageTitle: 'Settings',
  appearanceTitle: 'Appearance',
  appearance:
    'Enable dark mode or use the default setting to match your system preferences.',
  aboutTitle: 'About',
  cast: 'Select your prefered casting method.',
  title: 'Settings',
  description: 'Configure your Audius account',
  historyTitle: 'Listening History',
  usdcWallets: 'USDC Wallet',
  audioWallet: '$AUDIO Wallet',
  matrixMode: 'Matrix',
  verificationSuccessMessage:
    'Verification request received, pending review. Check back soon!',
  verificationErrorMessage:
    'Something went wrong. Please try again later.',
  pending: 'Pending',
  closeButton: 'Close'
}

type SettingsPageProps = {
  subPage?: SubPage
}

const SubPages = {
  [SubPage.ACCOUNT]: AccountSettingsPage as FC<SettingsPageProps>,
  [SubPage.ABOUT]: AboutSettingsPage as FC<SettingsPageProps>,
  [SubPage.NOTIFICATIONS]: NotificationsSettingsPage as FC<SettingsPageProps>,
  [SubPage.CHANGE_PASSWORD]: ChangePasswordMobilePage as FC<SettingsPageProps>,
  [SubPage.CHANGE_EMAIL]: ChangeEmailMobilePage as FC<SettingsPageProps>
}

export const SettingsPage = (props: SettingsPageProps) => {
  const { subPage } = props
  const dispatch = useDispatch()
  useScrollToTop()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({
      handle: user?.handle,
      userId: user?.user_id,
      name: user?.name
    })
  })
  const { userId, handle, name } = accountData ?? {}
  const theme = useSelector(getTheme)
  const { tier } = useTierAndVerifiedForUser(userId)
  const showMatrix = tier === 'gold' || tier === 'platinum'

  // Check for verification query param and show appropriate modal
  const verificationStatus = searchParams.get('verification')
  const [isVerificationSuccessModalOpen, setIsVerificationSuccessModalOpen] =
    useState(false)
  const [isVerificationErrorModalOpen, setIsVerificationErrorModalOpen] =
    useState(false)

  useEffect(() => {
    if (verificationStatus === 'success') {
      setIsVerificationSuccessModalOpen(true)
      // Remove query param from URL
      searchParams.delete('verification')
      setSearchParams(searchParams, { replace: true })
    } else if (verificationStatus === 'error') {
      setIsVerificationErrorModalOpen(true)
      // Remove query param from URL
      searchParams.delete('verification')
      setSearchParams(searchParams, { replace: true })
    }
  }, [verificationStatus, searchParams, setSearchParams])

  const handleCloseVerificationSuccessModal = useCallback(() => {
    setIsVerificationSuccessModalOpen(false)
  }, [])

  const handleCloseVerificationErrorModal = useCallback(() => {
    setIsVerificationErrorModalOpen(false)
  }, [])

  useEffect(() => {
    dispatch(getPushNotificationSettingsAction())
  }, [dispatch])

  useEffect(() => {
    dispatch(getNotificationSettingsAction())
  }, [dispatch])

  // Set Nav-Bar Menu
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(subPage ? LeftPreset.BACK : LeftPreset.CLOSE_NO_ANIMATION)
    setRight(null)
    setCenter(subPage || messages.pageTitle)
  }, [setLeft, setCenter, setRight, subPage])

  const profilePicture = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })

  const toggleTheme = (option: Theme) => {
    dispatch(
      make(Name.SETTINGS_CHANGE_THEME, {
        mode: option.toLowerCase() as 'dark' | 'light' | 'matrix' | 'auto'
      })
    )
    dispatch(setTheme({ theme: option }))
    if (option === Theme.MATRIX) {
      dispatch(show())
    }
  }

  // Render out subPage if we're on one.
  if (subPage && subPage in SubPages) {
    const SubPageComponent = SubPages[subPage]
    return <SubPageComponent {...props} />
  }

  const renderThemeSlider = () => {
    const options = [
      {
        key: Theme.AUTO,
        text: 'Auto'
      },
      {
        key: Theme.DARK,
        text: 'Dark'
      },
      {
        key: Theme.LIGHT,
        text: 'Light'
      }
    ]

    if (showMatrix) {
      options.push({ key: Theme.MATRIX, text: messages.matrixMode })
    }

    return (
      <SegmentedControl
        isMobile
        fullWidth
        options={options}
        selected={theme ?? Theme.AUTO}
        onSelectOption={(option) => toggleTheme(option)}
        key={`tab-slider-${options.length}`}
      />
    )
  }

  return (
    <Page
      title={messages.title}
      description={messages.description}
      contentClassName={styles.pageContent}
      containerClassName={styles.page}
    >
      <div className={styles.bodyContainer}>
        <div className={styles.logo}>
          <IconAudiusLogoHorizontalColor
            className={cn({
              [styles.whiteTint]: isDarkMode() || theme === Theme.MATRIX
            })}
          />
        </div>
        <GroupableList>
          <Grouping>
            <Row to={ACCOUNT_SETTINGS_PAGE}>
              <div className={styles.account}>
                <DynamicImage
                  image={profilePicture}
                  wrapperClassName={styles.profilePicture}
                />
                <div className={styles.info}>
                  <div className={styles.name}>{name}</div>
                  <div className={styles.handle}>{`@${handle}`}</div>
                </div>
              </div>
            </Row>
            <Row
              prefix={<i className='emoji small headphone' />}
              title={messages.historyTitle}
              to={HISTORY_PAGE}
            />
            <Row
              prefix={<IconLogoCircleUSDCPng size='s' />}
              title={messages.usdcWallets}
              to={PAYMENTS_PAGE}
            />
          </Grouping>
          <Grouping>
            <Row
              prefix={<i className='emoji small bell' />}
              title='Notifications'
              to={NOTIFICATION_SETTINGS_PAGE}
            />
            <Row
              prefix={<i className='emoji small waning-crescent-moon' />}
              title={messages.appearanceTitle}
              body={messages.appearance}
            >
              {renderThemeSlider()}
            </Row>
          </Grouping>
          <Grouping>
            <Row
              prefix={<i className='emoji small speech-balloon' />}
              title={messages.aboutTitle}
              to={ABOUT_SETTINGS_PAGE}
            />
          </Grouping>
        </GroupableList>
      </div>
      <Modal
        isOpen={isVerificationSuccessModalOpen}
        onClose={handleCloseVerificationSuccessModal}
        size='small'
      >
        <ModalContent>
          <Flex
            direction='column'
            alignItems='center'
            justifyContent='center'
            gap='l'
            pv='l'
          >
            <Flex alignItems='center' gap='s'>
              <IconVerified size='xl' />
              <Text size='xl' variant='label'>
                {messages.pending}
              </Text>
            </Flex>
            <Flex justifyContent='center'>
              <ModalContentText>
                {messages.verificationSuccessMessage}
              </ModalContentText>
            </Flex>
          </Flex>
        </ModalContent>
        <ModalFooter>
          <Button
            variant='primary'
            onClick={handleCloseVerificationSuccessModal}
            fullWidth
          >
            {messages.closeButton}
          </Button>
        </ModalFooter>
      </Modal>
      <Modal
        isOpen={isVerificationErrorModalOpen}
        onClose={handleCloseVerificationErrorModal}
        size='small'
      >
        <ModalContent>
          <Flex
            direction='column'
            alignItems='center'
            justifyContent='center'
            gap='l'
            pv='l'
          >
            <Flex justifyContent='center'>
              <ModalContentText>
                {messages.verificationErrorMessage}
              </ModalContentText>
            </Flex>
          </Flex>
        </ModalContent>
        <ModalFooter>
          <Button
            variant='primary'
            onClick={handleCloseVerificationErrorModal}
            fullWidth
          >
            {messages.closeButton}
          </Button>
        </ModalFooter>
      </Modal>
    </Page>
  )
}
