import React, { useCallback, useState } from 'react'

import { IconCaretDown, useClickOutside } from '@audius/stems'
import clsx from 'clsx'

import styles from './Dropdown.module.css'

type OwnProps = {
  options: string[]
  selection: string
  onSelectOption: (option: string) => void
  textFormatter?: (option: string) => string
}

type DropdownProps = OwnProps

const Dropdown: React.FC<DropdownProps> = ({
  options,
  selection,
  onSelectOption,
  textFormatter = (option: string) => option
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const onClickDropdown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen((isOpen) => !isOpen)
    },
    [setIsOpen]
  )
  const insideRef = useClickOutside(() => setIsOpen(false))
  const onClickOption = useCallback(
    (e: React.MouseEvent, o: string) => {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
      onSelectOption(o)
    },
    [onSelectOption, setIsOpen]
  )

  return (
    <div
      className={clsx(styles.dropdown, {
        [styles.isOpen]: isOpen
      })}
      ref={insideRef}
    >
      <div className={styles.selection} onClick={onClickDropdown}>
        {textFormatter(selection)}
        <IconCaretDown className={styles.caret} />
      </div>
      <div className={styles.list}>
        {options.map((option) => (
          <div
            key={option}
            className={styles.option}
            onClick={(e: React.MouseEvent) => onClickOption(e, option)}
          >
            {textFormatter(option)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dropdown
