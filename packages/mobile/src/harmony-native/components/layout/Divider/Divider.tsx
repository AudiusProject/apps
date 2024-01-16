import { css } from '@emotion/native'
import { View } from 'react-native'
import type { ViewStyle } from 'react-native/types'

import { useTheme } from '../../../foundations/theme'

import type { DividerProps } from './types'

/**
 * A separator between two elements, usually consisting of a horizontal or vertical line.
 */
export const Divider = (props: DividerProps) => {
  const { children, orientation = 'horizontal' } = props
  const { color, spacing } = useTheme()

  const viewCss: ViewStyle = {
    borderColor: color.border.strong,
    borderStyle: 'solid',
    margin: 0,

    ...(children &&
      orientation === 'horizontal' && {
        flexDirection: 'row',
        gap: spacing.s
      }),
    ...(children &&
      orientation === 'vertical' && {
        gap: spacing.xs
      }),

    ...(!children &&
      orientation === 'vertical' && {
        borderRightWidth: 1,
        alignSelf: 'stretch',
        height: 'auto'
      }),
    ...(!children &&
      orientation === 'horizontal' && {
        borderBottomWidth: 1
      })
  }

  const lineCss: ViewStyle = {
    borderColor: color.border.strong,
    borderStyle: 'solid',
    flex: 1,
    margin: 0,

    ...(orientation === 'vertical' && {
      borderRightWidth: 1,
      width: 1,
      alignSelf: 'center',
      height: 'auto'
    }),
    ...(orientation === 'horizontal' && {
      height: 1,
      alignSelf: 'center',
      borderBottomWidth: 1
    })
  }

  const role = children ? 'separator' : undefined

  return (
    <View role={role} style={css(viewCss)}>
      {children ? <View style={css(lineCss)} /> : null}
      {children}
      {children ? <View style={css(lineCss)} /> : null}
    </View>
  )
}
