import { useState, useCallback, useEffect, RefObject } from 'react'

import { CSSObject } from '@emotion/react'
import { List, ListRowProps } from 'react-virtualized'

import { MenuItem } from '~harmony/components/internal/MenuItem'

import { FilterButtonOptionType } from './types'

type VirtualizedOptionsListProps<Value extends string> = {
  options: FilterButtonOptionType<Value>[]
  optionRefs: RefObject<HTMLButtonElement[]>
  onChange: (value: Value) => void
  height: CSSObject['height']
  width: CSSObject['width']
}

export const VirtualizedOptionsList = <Value extends string>({
  options,
  optionRefs,
  onChange,
  height = 100,
  width = 100
}: VirtualizedOptionsListProps<Value>) => {
  const [rowHeight, setRowHeight] = useState(50)
  useEffect(() => {
    if (optionRefs.current?.[0]) {
      setRowHeight(optionRefs.current?.[0].offsetHeight)
    }
  }, [optionRefs])

  const renderItem = useCallback(
    ({ index, style }: ListRowProps) => {
      const option = options[index]

      return (
        <MenuItem
          style={style}
          variant='option'
          ref={(el) => {
            if (optionRefs && optionRefs.current && el) {
              optionRefs.current[index] = el
            }
          }}
          key={option.value}
          {...option}
          onChange={onChange}
        />
      )
    },
    [onChange, optionRefs, options]
  )

  return (
    <List
      width={Number(width)}
      height={Number(height)}
      rowCount={options.length}
      rowHeight={rowHeight}
      rowRenderer={renderItem}
    />
  )
}
