import { css } from '@emotion/native'

import type { TextProps } from '@audius/harmony-native'
import { Text } from '@audius/harmony-native'

type ErrorTextProps = TextProps

const wrap = css({
  flexShrink: 1
})

export const ErrorText = (props: ErrorTextProps) => {
  const { style, ...other } = props
  return (
    <Text
      variant='body'
      size='m'
      color='danger'
      style={[wrap, style]}
      {...other}
    />
  )
}
