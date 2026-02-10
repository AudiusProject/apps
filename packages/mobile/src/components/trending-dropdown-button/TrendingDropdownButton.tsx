import type { GestureResponderEvent } from 'react-native'
import { Pressable } from 'react-native'

import { IconCaretDown, Text } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

type TrendingDropdownButtonProps = {
  label: string
  onPress: (e: GestureResponderEvent) => void
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    height: spacing(8),
    paddingHorizontal: spacing(4),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.neutralLight8,
    borderRadius: spacing(4)
  },
  label: {
    fontSize: typography.fontSize.small,
    fontWeight: '600'
  }
}))

export const TrendingDropdownButton = (props: TrendingDropdownButtonProps) => {
  const { label, onPress } = props
  const styles = useStyles()

  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.label} color='default'>
        {label}
      </Text>
      <IconCaretDown size='2xs' color='default' />
    </Pressable>
  )
}
