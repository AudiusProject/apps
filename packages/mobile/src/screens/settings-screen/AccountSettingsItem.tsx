import type { ComponentType } from 'react'

import type { SvgProps } from 'react-native-svg'

import {
  Button,
  Flex,
  IconError,
  IconValidationCheck,
  Text
} from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

import { SettingsRowLabel } from './SettingRowLabel'
import { SettingsRow } from './SettingsRow'
import { SettingsRowDescription } from './SettingsRowDescription'

type AccountSettingsItemProps = {
  title: string
  titleIcon: ComponentType<SvgProps>
  description: string
  buttonTitle: string
  onPress?: () => void
  disabled?: boolean
  /** Optional verification status shown above the action button. */
  isVerified?: boolean
  verifiedText?: string
  notVerifiedText?: string
  /** Hide the action button (e.g. once the email is verified). */
  hideButton?: boolean
}

const useStyles = makeStyles(({ spacing }) => ({
  button: {
    marginTop: spacing(2)
  },
  status: {
    marginTop: spacing(2)
  }
}))

export const AccountSettingsItem = (props: AccountSettingsItemProps) => {
  const {
    title,
    titleIcon,
    description,
    buttonTitle,
    onPress,
    disabled,
    isVerified,
    verifiedText,
    notVerifiedText,
    hideButton
  } = props
  const styles = useStyles()

  return (
    <SettingsRow>
      <SettingsRowLabel label={title} icon={titleIcon} />
      <SettingsRowDescription>{description}</SettingsRowDescription>
      {verifiedText && notVerifiedText ? (
        <Flex row alignItems='center' gap='xs' style={styles.status}>
          {isVerified ? (
            <IconValidationCheck size='s' />
          ) : (
            <IconError size='s' color='subdued' />
          )}
          <Text variant='body' size='s' color='subdued'>
            {isVerified ? verifiedText : notVerifiedText}
          </Text>
        </Flex>
      ) : null}
      {hideButton ? null : (
        <Button
          style={styles.button}
          variant='secondary'
          size='small'
          fullWidth
          onPress={onPress}
          disabled={disabled}
        >
          {buttonTitle}
        </Button>
      )}
    </SettingsRow>
  )
}
