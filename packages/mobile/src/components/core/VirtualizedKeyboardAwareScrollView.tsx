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
/**
 * KeyboardAwareScrollView that can wrap an inner Virtualized List, allowing inner lists to
 * scroll the entire ScrollView
 *
 * This gives us much more flexibility with the layout and styling of FlatLists,
 * for example styling the FlatList content separately from the Header
 */
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
