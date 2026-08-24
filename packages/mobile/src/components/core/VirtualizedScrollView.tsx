import React, { type ReactElement, useRef, forwardRef } from 'react'

import type { FlatListProps } from 'react-native'
import { FlatList } from 'react-native'

import { useScrollToTop } from 'app/hooks/useScrollToTop'

import { BottomChin } from './BottomChin'

type BaseFlatListProps = Omit<
  FlatListProps<null>,
  'renderItem' | 'data' | 'ListHeaderComponent'
>

type VirtualizedScrollViewProps = BaseFlatListProps & {
  children: ReactElement | ReactElement[]
}
/**
 * ScrollView that can wrap an inner Virtualized List, allowing inner lists to
 * scroll the entire ScrollView
 *
 * This gives us much more flexibility with the layout and styling of FlatLists,
 * for example styling the FlatList content separately from the Header
 */
export const VirtualizedScrollView = forwardRef<
  FlatList,
  VirtualizedScrollViewProps
>((props, ref) => {
  const { children, ...other } = props
  const listHeader = Array.isArray(children) ? <>{children}</> : children
  const innerRef = useRef<FlatList>(null)
  const combinedRef = (ref ?? innerRef) as React.RefObject<FlatList>

  useScrollToTop(() => {
    combinedRef.current?.scrollToOffset({
      offset: 0,
      animated: true
    })
  })

  return (
    <FlatList
      ref={combinedRef}
      ListHeaderComponent={listHeader}
      data={null}
      renderItem={() => null}
      scrollIndicatorInsets={{ right: Number.MIN_VALUE }}
      ListFooterComponent={BottomChin}
      {...other}
    />
  )
})
