import { useCallback, useState } from 'react'
import type { ComponentType } from 'react'

import type { Maybe } from '@audius/common/utils'

import { ModalScreen } from 'app/components/core'
import { useRoute } from 'app/hooks/useRoute'
import { ListSelectionScreen } from 'app/screens/list-selection-screen'

import type { FilterButtonOptionType, ScreenProps } from './types'

export type FilterButtonScreenParams = {
  options?: FilterButtonOptionType<string>[]
  title: string
  onChange: (value: Maybe<string>) => void
  value: string
  screen?: ComponentType<ScreenProps<string>>
  disableSearch?: boolean
}

export const FilterButtonScreen = () => {
  const { params } = useRoute<'FilterButton'>()
  const {
    options,
    title,
    onChange: onSubmit,
    value: initialValue,
    screen: Screen,
    disableSearch = false
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
          disableSearch={disableSearch}
          clearable={Boolean(value)}
          onClear={() => setValue(undefined)}
        />
      </ModalScreen>
    )
  }

  return null
}
