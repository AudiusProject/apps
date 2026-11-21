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
