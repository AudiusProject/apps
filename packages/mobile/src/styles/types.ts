import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native'

export type StylesProp<T> = { [K in keyof T]?: StyleProp<T[K]> }

type Style = StyleProp<ViewStyle | ImageStyle | TextStyle>

export type StylesProps<
  Styles extends { root?: Style } & Record<string, Style>
> = {
  style?: Styles['root']
  styles?: Styles
}
