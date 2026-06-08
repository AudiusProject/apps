import { View } from 'react-native'

import { SelectablePill } from '@audius/harmony-native'
import type { SelectablePillProps } from 'app/harmony-native/components/input/SelectablePill/types'

type ScreenHeaderButtonProps = Omit<SelectablePillProps, 'type'>

export const ScreenHeaderButton = (props: ScreenHeaderButtonProps) => {
  return (
    <View>
      <SelectablePill
        {...({
          type: 'button',
          isSelected: true,
          isControlled: true,
          ...props
        } as SelectablePillProps)}
      />
    </View>
  )
}
