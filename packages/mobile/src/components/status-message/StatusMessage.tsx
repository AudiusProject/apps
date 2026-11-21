import type { TextStyle, ViewStyle } from 'react-native'
import { Text, View } from 'react-native'

import {
  IconValidationCheck,
  IconMultiselectRemove
} from '@audius/harmony-native'
import type { StylesProps } from 'app/styles'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

type MessageStatus = 'default' | 'valid' | 'error'

type StatusMessageProps = {
  label: string
  status: MessageStatus
} & StylesProps<{
  root?: ViewStyle
  text?: TextStyle
}>

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  root: {
    flexDirection: 'row',
    marginVertical: spacing(2),
    marginHorizontal: spacing(2),
    alignItems: 'center'
  },
  icon: {
    marginRight: spacing(3)
  },
  iconPlaceholder: {
    height: 16,
    width: 16,
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: palette.neutralLight4
  },
  label: {
    ...typography.body
  }
}))

export const StatusMessage = ({
  label,
  status,
  style,
  styles: stylesProp = {}
}: StatusMessageProps) => {
  const styles = useStyles()
  const { neutral } = useThemeColors()

  const Icon =
    status === 'valid'
      ? IconValidationCheck
      : status === 'error'
        ? IconMultiselectRemove
        : View

  return (
    <View style={[styles.root, style, stylesProp.root]}>
      <Icon
        style={[styles.iconPlaceholder, styles.icon]}
        height={16}
        width={16}
      />
      <Text
        style={[
          styles.label,
          { color: status === 'error' ? '#e03d51' : neutral },
          stylesProp.text
        ]}
      >
        {label}
      </Text>
    </View>
  )
}
