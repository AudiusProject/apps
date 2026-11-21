import type { ReactElement } from 'react'

import type { KeyboardAwareFlatListProps } from 'react-native-keyboard-aware-scroll-view'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'

import { BottomChin } from './BottomChin'

type BaseFlatListProps = Omit<
  KeyboardAwareFlatListProps<null>,
  'renderItem' | 'data' | 'ListHeaderComponent'
>

type VirtualizedScrollViewProps = BaseFlatListProps & {
  children: ReactElement | ReactElement[]
}
export const VirtualizedKeyboardAwareScrollView = (
  props: VirtualizedScrollViewProps
) => {
  const { children, ...other } = props
  const listHeader = Array.isArray(children) ? <>{children}</> : children

  return (
    <KeyboardAwareFlatList
      ListHeaderComponent={listHeader}
      data={null}
      renderItem={() => null}
      scrollIndicatorInsets={{ right: Number.MIN_VALUE }}
      ListFooterComponent={BottomChin}
      {...other}
    />
  )
}
