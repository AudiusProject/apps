import type { ComponentType } from 'react'

import type { SvgProps } from 'react-native-svg'

import { Button } from '@audius/harmony-native'
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
}

const useStyles = makeStyles(({ spacing }) => ({
  button: {
    marginTop: spacing(2)
  }
}))

export const AccountSettingsItem = (props: AccountSettingsItemProps) => {
  const { title, titleIcon, description, buttonTitle, onPress } = props
  const styles = useStyles()

  return (
    <SettingsRow>
      <SettingsRowLabel label={title} icon={titleIcon} />
      <SettingsRowDescription>{description}</SettingsRowDescription>
      <Button
        style={styles.button}
        variant='secondary'
        fullWidth
        onPress={onPress}
      >
        {buttonTitle}
      </Button>
    </SettingsRow>
  )
}
