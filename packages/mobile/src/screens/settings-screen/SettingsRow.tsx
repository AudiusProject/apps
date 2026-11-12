import type { ReactNode } from 'react'

import type { StyleProp, ViewStyle } from 'react-native'
import { View, TouchableOpacity } from 'react-native'

import { IconCaretRight } from '@audius/harmony-native'
import { Link } from 'app/components/core'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const useStyles = makeStyles(({ palette, spacing }) => ({
  firstItem: {
    borderTopColor: palette.neutralLight7,
    borderTopWidth: 1
  },
  root: {
    backgroundColor: palette.white
  },
  row: {
    backgroundColor: palette.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    borderBottomColor: palette.neutralLight7,
    borderBottomWidth: 1
  },
  content: {
    flex: 1
  }
}))

type SettingsRowProps = {
  onPress?: () => void
  url?: string
  children: ReactNode
  firstItem?: boolean
  style?: StyleProp<ViewStyle>
}

export const SettingsRow = (props: SettingsRowProps) => {
  const { onPress, children, firstItem, style, url } = props
  const styles = useStyles()
  const { neutralLight4 } = useThemeColors()

  const Row = url ? Link : onPress ? TouchableOpacity : View

  return (
    <View style={[styles.root, firstItem && styles.firstItem]}>
      <Row url={url as string} onPress={onPress} style={[styles.row, style]}>
        <View style={styles.content}>{children}</View>
        {onPress || url ? (
          <IconCaretRight fill={neutralLight4} height={16} width={16} />
        ) : null}
      </Row>
    </View>
  )
}
