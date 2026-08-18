import { RefObject } from 'react'

import { MenuItem } from '~harmony/components/internal/MenuItem'
import { OptionKeyHandler } from '~harmony/components/internal/OptionKeyHandler'

import { FilterButtonOptionType } from './types'

type OptionsListProps<Value extends string> = {
  options: FilterButtonOptionType<Value>[]
  isOpen: boolean
  optionRefs: RefObject<HTMLButtonElement[]>
  scrollRef: RefObject<HTMLDivElement | null>
  onChange: (value: Value) => void
}

export const OptionsList = <Value extends string>({
  options,
  isOpen,
  optionRefs,
  scrollRef,
  onChange
}: OptionsListProps<Value>) => {
  return (
    <OptionKeyHandler
      options={options}
      disabled={!isOpen}
      onChange={onChange}
      optionRefs={optionRefs}
      scrollRef={scrollRef}
    >
      {(activeValue) =>
        options.map((option, index) => (
          <MenuItem
            variant='option'
            ref={(el) => {
              if (optionRefs && optionRefs.current && el) {
                optionRefs.current[index] = el
              }
            }}
            key={option.value}
            {...option}
            label={option.label ?? option.value}
            onChange={onChange}
            isActive={option.value === activeValue}
          />
        ))
      }
    </OptionKeyHandler>
  )
}
