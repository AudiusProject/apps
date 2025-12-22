import { useState, useRef } from 'react'

import {
  IconCaretDown,
  PopupMenu
} from '@audius/harmony'
import cn from 'classnames'
import PropTypes from 'prop-types'

import styles from './Dropdown.module.css'

const Dropdown = ({
  size = 'small',
  variant = 'shadow',
  label = '',
  disabled = false,
  error = false,
  menu,
  onSelect,
  onSelectIndex,
  defaultIndex = 0,
  textClassName,
  focused: focusedProp
}) => {
  const [index, setIndex] = useState(defaultIndex)
  const [internalFocused, setInternalFocused] = useState(false)

  const focused = focusedProp !== undefined ? focusedProp : internalFocused

  const handleVisibleChange = (visible) => {
    setInternalFocused(visible)
  }

  const handleClick = (clickedIndex, callback) => {
    setIndex(clickedIndex)
    setInternalFocused(false)
    if (callback) callback()
    onSelect?.(menu?.items[clickedIndex]?.text)
    onSelectIndex?.(clickedIndex)
  }

  const style = {
    [styles.large]: size === 'large',
    [styles.medium]: size === 'medium',
    [styles.small]: size === 'small',
    [styles.focused]: focused,
    [styles.disabled]: disabled,
    [styles.error]: error,
    [styles.shadow]: variant === 'shadow',
    [styles.border]: variant === 'border'
  }

  const popupMenuItems = menu.items.map((item, i) => ({
    text: item.text,
    onClick: (e) => {
      handleClick(i, item.onClick)
    }
  }))

  const selection = menu.items.length > 0 ? menu.items[index].text : null
  const containerRef = useRef(null)

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {label ? <div className={styles.label}>{label}</div> : null}
      <div className={cn(styles.dropdown, style)}>
        <PopupMenu
          items={popupMenuItems}
          onClose={() => handleVisibleChange(false)}
          id={`dropdown-${label || 'default'}`}
          containerRef={containerRef}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          renderTrigger={(anchorRef, triggerPopup, triggerProps) => (
            <div
              ref={anchorRef}
              {...triggerProps}
              className={styles.selector}
              onClick={() => {
                if (!disabled) {
                  handleVisibleChange(true)
                  triggerPopup()
                }
              }}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
              <div className={cn(styles.selectorText, textClassName)}>
                {selection}
              </div>
              <IconCaretDown className={styles.iconCaret} />
            </div>
          )}
        />
      </div>
    </div>
  )
}

Dropdown.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['shadow', 'border']),
  label: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  menu: PropTypes.object,
  onSelect: PropTypes.func,
  onSelectIndex: PropTypes.func,
  defaultIndex: PropTypes.number,
  focused: PropTypes.bool
}

export default Dropdown
