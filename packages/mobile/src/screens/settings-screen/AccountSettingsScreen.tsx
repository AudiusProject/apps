import { useCallback, useEffect } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { Status } from '@audius/common/models'
import {
  recoveryEmailActions,
  recoveryEmailSelectors,
  modalsActions
} from '@audius/common/store'
import { css } from '@emotion/native'
import { pick } from 'lodash'
import { Text, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  IconEmailAddress,
  IconKey,
  IconRecoveryEmail,
  IconSignOut,
  IconSkull,
  IconUser
} from '@audius/harmony-native'
import {
  ScrollView,
  Screen,
  ScreenContent,
  ProfilePicture
} from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'

import type { ProfileTabScreenParamList } from '../app-screen/ProfileTabScreen'

import { AccountSettingsItem } from './AccountSettingsItem'
const { resendRecoveryEmail } = recoveryEmailActions
const { getRecoveryEmailStatus } = recoveryEmailSelectors
const { setVisibility } = modalsActions

const messages = {
  title: 'Account',
  recoveryTitle: 'Recovery Email',
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
  deleteAccountButtonTitle: 'Delete Account'
}

const useStyles = makeStyles(({ typography, palette, spacing }) => ({
  header: {
    alignItems: 'center',
    paddingVertical: spacing(8)
  },
  name: { ...typography.h2, color: palette.neutral, marginTop: spacing(1) },
  handle: {
    ...typography.h2,
    color: palette.neutral,
    fontFamily: typography.fontByWeight.medium
  }
}))

export const AccountSettingsScreen = () => {
  const styles = useStyles()
  const { toast } = useToast()
  const dispatch = useDispatch()
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => pick(user, ['user_id', 'handle', 'name'])
  })
  const {
    user_id: accountUserId,
    handle: accountHandle,
    name: accountName
  } = accountData ?? {}

  const recoveryEmailStatus = useSelector(getRecoveryEmailStatus)
  const navigation = useNavigation<ProfileTabScreenParamList>()

  const handlePressRecoveryEmail = useCallback(() => {
    dispatch(resendRecoveryEmail())
  }, [dispatch])

  useEffect(() => {
    if (recoveryEmailStatus === Status.SUCCESS) {
      toast({ content: messages.recoveryEmailSent })
    }
    if (recoveryEmailStatus === Status.ERROR) {
      toast({ content: messages.recoveryEmailSent })
    }
  }, [recoveryEmailStatus, toast])

  const handlePressChangeEmail = useCallback(() => {
    navigation.push('ChangeEmail')
  }, [navigation])

  const handlePressChangePassword = useCallback(() => {
    navigation.push('ChangePassword')
  }, [navigation])

  const openSignOutDrawer = useCallback(() => {
    dispatch(setVisibility({ modal: 'SignOutConfirmation', visible: true }))
  }, [dispatch])

  const openDeactivateAccountDrawer = useCallback(() => {
    dispatch(
      setVisibility({ modal: 'DeactivateAccountConfirmation', visible: true })
    )
  }, [dispatch])

  if (!accountUserId) return null

  return (
    <Screen
      title={messages.title}
      icon={IconUser}
      topbarRight={null}
      variant='secondary'
    >
      <ScreenContent>
        <ScrollView>
          <View style={styles.header}>
            <ProfilePicture
              userId={accountUserId}
              style={css({ width: 128, height: 128 })}
            />
            <Text style={styles.name}>{accountName}</Text>
            <Text style={styles.handle}>@{accountHandle}</Text>
          </View>
          <AccountSettingsItem
            title={messages.recoveryTitle}
            titleIcon={IconRecoveryEmail}
            description={messages.recoveryDescription}
            buttonTitle={messages.recoveryButtonTitle}
            onPress={handlePressRecoveryEmail}
          />
          <AccountSettingsItem
            title={messages.emailTitle}
            titleIcon={IconEmailAddress}
            description={messages.emailDescription}
            buttonTitle={messages.emailButtonTitle}
            onPress={handlePressChangeEmail}
          />
          <AccountSettingsItem
            title={messages.passwordTitle}
            titleIcon={IconKey}
            description={messages.passwordDescription}
            buttonTitle={messages.passwordButtonTitle}
            onPress={handlePressChangePassword}
          />
          <AccountSettingsItem
            title={messages.signOutTitle}
            titleIcon={IconSignOut}
            description={messages.signOutDescription}
            buttonTitle={messages.signOutButtonTitle}
            onPress={openSignOutDrawer}
          />
          <AccountSettingsItem
            title={messages.deleteAccountTitle}
            titleIcon={IconSkull}
            description={messages.deleteAccountDescription}
            buttonTitle={messages.deleteAccountButtonTitle}
            onPress={openDeactivateAccountDrawer}
          />
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
