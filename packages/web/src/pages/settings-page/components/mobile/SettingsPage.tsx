import { useContext, useEffect, FC } from 'react'

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
  SegmentedControl,
  IconAudiusLogoHorizontalColor,
  IconLogoCircleUSDCPng,
  IconTokenNoTier,
  IconTokenBronze,
  IconTokenSilver,
  IconTokenGold,
  IconTokenPlatinum
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import GroupableList from 'components/groupable-list/GroupableList'
import Grouping from 'components/groupable-list/Grouping'
import Row from 'components/groupable-list/Row'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'
import Page from 'components/page/Page'
import { useProfilePicture } from 'hooks/useProfilePicture'
import useScrollToTop from 'hooks/useScrollToTop'
import { env } from 'services/env'
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
  AUDIO_PAGE,
  PAYMENTS_PAGE
} = route

const isStaging = env.ENVIRONMENT === 'staging'

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
    "Enable dark mode or choose 'Auto' to change with your system settings",
  aboutTitle: 'About',
  cast: 'Select your prefered casting method.',
  title: 'Settings',
  description: 'Configure your Audius account',
  historyTitle: 'Listening History',
  usdcWallets: 'USDC Wallet',
  audioWallet: '$AUDIO Wallet',
  matrixMode: 'Matrix'
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
  const showMatrix = tier === 'gold' || tier === 'platinum' || isStaging

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
        mode:
          option === Theme.DEFAULT
            ? 'light'
            : (option.toLowerCase() as 'dark' | 'light' | 'matrix' | 'auto')
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
        key: Theme.DEFAULT,
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
        selected={theme || Theme.DEFAULT}
        onSelectOption={(option) => toggleTheme(option)}
        key={`tab-slider-${options.length}`}
      />
    )
  }

  const TierIcon = {
    none: IconTokenNoTier,
    bronze: IconTokenBronze,
    silver: IconTokenSilver,
    gold: IconTokenGold,
    platinum: IconTokenPlatinum
  }[tier]

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
            <Row
              prefix={<TierIcon size='s' />}
              title={messages.audioWallet}
              to={AUDIO_PAGE}
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
    </Page>
  )
}
