import type { ReactNode } from 'react'
import { useCallback } from 'react'

import type { StyleProp, ViewStyle } from 'react-native'
import { TouchableOpacity, View } from 'react-native'

import { Divider, IconCaretRight } from '@audius/harmony-native'
import { Text } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import type { StylesProp } from 'app/styles'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'

import { InputErrorMessage } from './InputErrorMessage'

export type ContextualMenuProps = {
  label: string
  value: any
  menuScreenName: string
  styles?: StylesProp<{
    root: ViewStyle
    divider: ViewStyle
    content: ViewStyle
  }>
  error?: boolean
  errorMessage?: string
  lastItem?: boolean
  startAdornment?: ReactNode
  renderValue?: (value: any) => ReactNode | null
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  content: {
    marginVertical: spacing(4),
    paddingHorizontal: spacing(4)
  },
  select: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing(2)
  },
  value: {
    marginHorizontal: spacing(2)
  },
  optionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing(2)
  },
  pill: {
    marginTop: spacing(2),
    marginRight: spacing(2),
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1)
  },
  optionPill: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: palette.neutralLight8,
    borderWidth: 1,
    borderColor: palette.neutralLight7,
    opacity: 0.8,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center'
  }
}))

export const ContextualMenu = (props: ContextualMenuProps) => {
  const {
    label,
    startAdornment,
    value,
    menuScreenName,
    styles: stylesProp,
    errorMessage,
    error,
    lastItem,
    renderValue: renderValueProp
  } = props
  const styles = useStyles()

  const { neutralLight4 } = useThemeColors()
  const navigation = useNavigation()

  const handlePress = useCallback(() => {
    navigation.navigate(menuScreenName)
  }, [navigation, menuScreenName])

  const defaultRenderValue = (value: string | string[]) => {
    const values = typeof value === 'string' ? [value] : value

    return (
      <View style={styles.optionPills}>
        {values.map((value, i) => (
          <SelectedValue key={`${value}-${i}`} style={styles.pill}>
            {startAdornment ? <View>{startAdornment}</View> : null}
            <Text fontSize='small' weight='demiBold'>
              {value}
            </Text>
          </SelectedValue>
        ))}
      </View>
    )
  }

  const renderValue = renderValueProp ?? defaultRenderValue

  const hasValue = !value
    ? false
    : typeof value === 'string'
      ? value
      : value.length !== 0

  return (
    <TouchableOpacity onPress={handlePress} style={stylesProp?.root}>
      <Divider style={stylesProp?.divider} />
      <View style={[styles.content, stylesProp?.content]}>
        <View style={styles.select}>
          <Text fontSize='large' weight='demiBold'>
            {label}
          </Text>
          <IconCaretRight
            fill={neutralLight4}
            height={spacing(4)}
            width={spacing(4)}
          />
        </View>
        {hasValue ? (
          <View style={styles.value}>{renderValue(value)}</View>
        ) : null}
        {error && errorMessage ? (
          <InputErrorMessage message={errorMessage} />
        ) : null}
      </View>
      {lastItem ? <Divider style={stylesProp?.divider} /> : null}
    </TouchableOpacity>
  )
}

type SelectedValueProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export const SelectedValue = (props: SelectedValueProps) => {
  const { children, style } = props
  const styles = useStyles()

  return <View style={[styles.optionPill, style]}>{children}</View>
}
