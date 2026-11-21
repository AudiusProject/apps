import type { ReactNode } from 'react'

import type { StyleProp, ViewStyle } from 'react-native'
import { TouchableOpacity } from 'react-native'

import { Flex } from '@audius/harmony-native'

type ExpandableProps = {
  expanded: boolean
  children?: ReactNode
  renderHeader?: () => ReactNode
  onToggleExpand?: () => void
  style?: StyleProp<ViewStyle>
}

export const Expandable = ({
  expanded,
  children,
  onToggleExpand,
  renderHeader,
  style: styleProp
}: ExpandableProps) => {
  return (
    <Flex style={styleProp}>
      <TouchableOpacity onPress={onToggleExpand}>
        {renderHeader?.()}
      </TouchableOpacity>
      {expanded ? children : null}
    </Flex>
  )
}
