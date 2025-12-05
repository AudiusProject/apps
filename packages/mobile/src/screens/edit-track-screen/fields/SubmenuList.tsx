import { Children, cloneElement } from 'react'
import type { ReactNode, ReactElement } from 'react'

import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'

import { spacing } from 'app/styles/spacing'

type SubmenuListProps = {
  children: ReactNode
  removeBottomDivider?: boolean
  style?: StyleProp<ViewStyle>
}

// Helper component to manage spacing and borders for a list of contextual-submenu fields
export const SubmenuList = (props: SubmenuListProps) => {
  const { children, removeBottomDivider, style } = props
  const updatedChildren = Children.map(children, (child: ReactElement, index) =>
    cloneElement(child, {
      // @ts-ignore
      lastItem:
        !removeBottomDivider &&
        index === Children.count(children as ReactElement[]) - 1
    })
  )
  return (
    <View style={[style, { marginVertical: spacing(2) }]}>
      {updatedChildren}
    </View>
  )
}
