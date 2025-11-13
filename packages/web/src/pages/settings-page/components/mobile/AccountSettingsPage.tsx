import { useState, useContext, useCallback } from 'react'

import { useQueryContext, useCurrentAccountUser } from '@audius/common/api'
import { Name, SquareSizes } from '@audius/common/models'
import { route } from '@audius/common/utils'
import {
  Button,
  IconRecoveryEmail,
  IconEmailAddress,
  IconKey,
  IconSignOut,
  Flex,
  Text,
  IconComponent,
  useTheme
} from '@audius/harmony'
import { debounce } from 'lodash'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { ToastContext } from 'components/toast/ToastContext'
import { useProfilePicture } from 'hooks/useProfilePicture'
import SignOutModal from 'pages/settings-page/components/mobile/SignOutModal'
import { push } from 'utils/navigation'

import styles from './AccountSettingsPage.module.css'
import settingsPageStyles from './SettingsPage.module.css'

const { CHANGE_EMAIL_SETTINGS_PAGE, CHANGE_PASSWORD_SETTINGS_PAGE } = route

const messages = {
  title: 'Account',
  description: 'Configure your Audius account',
  recoveryTitle: 'Resend Recovery Email',
  recoveryDescription:
    'Store your recovery email safely. This email is the only way to recover your account if you forget your password.',
  recoveryButtonTitle: 'Resend Recovery Email',
  recoveryEmailSent: 'Recovery Email Sent!',
  recoveryEmailNotSent: 'Unable to send recovery email. Please try again!',
  emailTitle: 'Change Email',
  emailDescription: 'Change the email you use to sign in and receive emails.',
  emailButtonTitle: 'Change Email',
  passwordTitle: 'Change Password',
  passwordDescription: 'Change the password to your Audius account.',
  passwordButtonTitle: 'Change Password',
  signOutTitle: 'Sign Out',
  signOutDescription: 'Sign out of your Audius Account.',
  signOutButtonTitle: 'Sign Out',
  deleteAccountTitle: 'Delete Account',
  deleteAccountDescription: 'Delete your account. This cannot be undone',
  deleteAccountButtonTitle: 'Delete Account',

  signOut:
    'Make sure you have your account recovery email stored somewhere safe before signing out!',
  emailSent: 'Email Sent!',
  emailNotSent: 'Something broke! Please try again!'
}

type AccountSettingsItemProps = {
  title: string
  description: string
  icon: IconComponent
  buttonTitle: string
  disabled?: boolean
  onClick: () => void
}

const AccountSettingsItem = ({
  title,
  description,
  icon: Icon,
  buttonTitle,
  disabled,
  onClick
}: AccountSettingsItemProps) => {
  const { color } = useTheme()
  return (
    <Flex
      direction='column'
      ph='l'
      pv='m'
      gap='s'
      backgroundColor='white'
      w='100%'
      css={{
        borderTop: `1px solid ${color.border.default}`,
        '&:last-child': {
          borderBottom: `1px solid ${color.border.default}`
        }
      }}
    >
      <Flex alignItems='center' gap='s'>
        <Icon color='default' width={16} height={16} />
        <Text variant='title' strength='weak' size='s'>
          {title}
        </Text>
      </Flex>
      <Text
        variant='body'
        size='xs'
        textAlign='start'
        css={{ lineHeight: '166%' }}
      >
        {description}
      </Text>
      <Button
        variant='secondary'
        size='small'
        fullWidth
        onClick={onClick}
        disabled={disabled}
      >
        {buttonTitle}
      </Button>
    </Flex>
  )
}

const AccountSettingsPage = () => {
  const dispatch = useDispatch()
  const { authService, identityService } = useQueryContext()
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({
      handle: user?.handle,
      userId: user?.user_id,
      name: user?.name
    })
  })
  const { userId, handle, name } = accountData ?? {}
  const [showModalSignOut, setShowModalSignOut] = useState(false)
  const { toast } = useContext(ToastContext)

  const goToRoute = useCallback(
    (route: string) => dispatch(push(route)),
    [dispatch]
  )

  const profilePicture = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_480_BY_480
  })
  const record = useRecord()
  const onClickRecover = useCallback(
    () =>
      debounce(
        async () => {
          try {
            await identityService.sendRecoveryInfo(
              await authService.generateRecoveryInfo()
            )
            toast(messages.emailSent)
            record(make(Name.SETTINGS_RESEND_ACCOUNT_RECOVERY, {}))
          } catch (e) {
            toast(messages.emailNotSent)
          }
        },
        2000,
        { leading: true, trailing: false }
      )(),
    [authService, identityService, toast, record]
  )

  const goToChangePasswordSettingsPage = useCallback(() => {
    goToRoute(CHANGE_PASSWORD_SETTINGS_PAGE)
  }, [goToRoute])

  const goToChangeEmailSettingsPage = useCallback(() => {
    goToRoute(CHANGE_EMAIL_SETTINGS_PAGE)
  }, [goToRoute])

  return (
    <MobilePageContainer
      title={messages.title}
      description={messages.description}
      containerClassName={settingsPageStyles.pageBackground}
    >
      <div className={settingsPageStyles.bodyContainer}>
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
        <AccountSettingsItem
          icon={IconRecoveryEmail}
          title={messages.recoveryTitle}
          description={messages.recoveryDescription}
          buttonTitle={messages.recoveryButtonTitle}
          onClick={onClickRecover}
        />
        <AccountSettingsItem
          icon={IconEmailAddress}
          title={messages.emailTitle}
          description={messages.emailDescription}
          buttonTitle={messages.emailButtonTitle}
          onClick={goToChangeEmailSettingsPage}
        />
        <AccountSettingsItem
          icon={IconKey}
          title={messages.passwordTitle}
          description={messages.passwordDescription}
          buttonTitle={messages.passwordButtonTitle}
          onClick={goToChangePasswordSettingsPage}
        />
        <AccountSettingsItem
          icon={IconSignOut}
          title={messages.signOutTitle}
          description={messages.signOutDescription}
          buttonTitle={messages.signOutButtonTitle}
          onClick={() => setShowModalSignOut(true)}
        />
        <SignOutModal
          isOpen={showModalSignOut}
          onClose={() => setShowModalSignOut(false)}
        />
      </div>
    </MobilePageContainer>
  )
}

export default AccountSettingsPage
