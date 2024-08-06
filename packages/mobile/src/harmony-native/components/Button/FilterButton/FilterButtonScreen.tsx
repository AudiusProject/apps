import { useCallback, useState } from 'react'
import type { ComponentType } from 'react'

import type { Maybe, Nullable } from '@audius/common/utils'

import { ModalScreen } from 'app/components/core'
import { useRoute } from 'app/hooks/useRoute'
import { ListSelectionScreen } from 'app/screens/list-selection-screen'

import type { FilterButtonOptionType, ScreenProps } from './types'

export type FilterButtonScreenParams = {
  options?: FilterButtonOptionType<string>[]
  title: string
  onChange: (value: Nullable<string>) => void
  value: string
  screen?: ComponentType<ScreenProps<string>>
}

export const FilterButtonScreen = () => {
  const { params } = useRoute<'FilterButton'>()
  const {
    options,
    title,
    onChange: onSubmit,
    value: initialValue,
    screen: Screen
  } = params ?? {}

  const [value, setValue] = useState<Maybe<string>>(initialValue)

  const handleSubmit = useCallback(() => {
    onSubmit(value)
  }, [onSubmit, value])

  if (Screen) {
    return <Screen onSubmit={handleSubmit} onChange={setValue} value={value} />
  }

  if (options) {
    return (
      <ModalScreen>
        <ListSelectionScreen
          data={options}
          screenTitle={title}
          onChange={setValue}
          value={value ?? ''}
          onSubmit={handleSubmit}
          searchText={`Search ${title}`}
          clearable={Boolean(value)}
          onClear={() => setValue(undefined)}
        />
      </ModalScreen>
    )
  }

  return null
}
