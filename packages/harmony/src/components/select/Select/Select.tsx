import {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useMemo,
  Ref,
  useEffect,
  MouseEvent
} from 'react'

import { mergeRefs } from 'react-merge-refs'

import { TextInput } from '~harmony/components/input'

import { useControlled } from '../../../hooks/useControlled'
import { IconCaretDown, IconCloseAlt } from '../../../icons'
import { Menu, MenuContent, MenuProps } from '../../internal/Menu'
import { MenuItem } from '../../internal/MenuItem'
import { OptionKeyHandler } from '../../internal/OptionKeyHandler'
import { Flex } from '../../layout'
import { Text } from '../../text'

import { SelectProps } from './types'

const messages = {
  noMatches: 'No matches'
}

const defaultMenuProps: Partial<MenuProps> = {
  anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
  transformOrigin: { horizontal: 'left', vertical: 'top' }
}

/**
 * A form input used for selecting a value: when collapsed it shows the
 * currently selected option and when expanded, it shows a scrollable list
 * of predefined options for the user to choose from.
 */
export const Select = forwardRef(function Select<Value extends string>(
  props: SelectProps<Value>,
  ref: Ref<HTMLInputElement>
) {
  const {
    value: valueProp,
    options,
    menuProps,
    onChange,
    onClick,
    clearable,
    children,
    renderSelectedOptionLabel: renderSelectedOptionlabel,
    ...other
  } = props

  const { label, hideLabel } = other

  const [value, setValue] = useControlled({
    controlledProp: valueProp,
    defaultValue: null,
    stateName: 'selection',
    componentName: 'Select'
  })

  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const selectedOption = options.find((option) => option.value === value)
  const selectedLabel = selectedOption
    ? (renderSelectedOptionlabel?.(selectedOption) ??
      selectedOption.label ??
      selectedOption.value)
    : ''
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const optionRefs = useRef<HTMLButtonElement[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const handleChange = useCallback(
    (value: Value) => {
      setValue(value)
      setInputValue('')
      onChange?.(value)
      setIsOpen(false)
    },
    [onChange, setValue]
  )

  useEffect(() => {
    if (isOpen) {
      // Focus the input after the popup is open
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true })
      }, 0)
    }
  }, [isOpen])

  const filteredOptions = useMemo(
    () =>
      options.filter(({ value, label }) => {
        return (
          !inputValue ||
          label?.toLowerCase().includes(inputValue.toLowerCase()) ||
          value.toLowerCase().includes(inputValue.toLowerCase())
        )
      }),
    [options, inputValue]
  )

  const handleClick = useCallback(
    (e: MouseEvent<HTMLInputElement>) => {
      setIsOpen(true)
      onClick?.(e)
    },
    [onClick]
  )

  const handleClickIcon = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      e.stopPropagation()
      e.preventDefault()
      if (value !== null && clearable) {
        setValue(null)
        // @ts-ignore
        onChange?.(null)
      } else {
        setIsOpen((isOpen: boolean) => !isOpen)
      }
    },
    [value, clearable, setValue, onChange]
  )

  const Icon = value !== null && clearable ? IconCloseAlt : IconCaretDown

  const optionElements = (
    <OptionKeyHandler
      options={filteredOptions}
      disabled={!isOpen}
      optionRefs={optionRefs}
      scrollRef={scrollRef}
      onChange={handleChange}
    >
      {(activeValue) =>
        filteredOptions.length === 0 ? (
          <Flex justifyContent='center'>
            <Text variant='body' color='subdued' size='s'>
              {messages.noMatches}
            </Text>
          </Flex>
        ) : (
          filteredOptions?.map((option, index) => (
            <MenuItem
              ref={(el) => {
                if (optionRefs && optionRefs.current && el) {
                  optionRefs.current[index] = el
                }
              }}
              key={option.value}
              variant='option'
              {...option}
              onChange={handleChange}
              isActive={option.value === activeValue}
            />
          ))
        )
      }
    </OptionKeyHandler>
  )

  return (
    <Flex ref={anchorRef}>
      <TextInput
        ref={mergeRefs([ref, inputRef])}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onClick={handleClick}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        autoComplete='off'
        endIcon={Icon}
        IconProps={{ onClick: handleClickIcon }}
        elevateLabel={!!selectedOption && !hideLabel}
        hidePlaceholder={!!selectedOption}
        {...other}
      />
      {/* Overlay selected option */}
      {selectedOption && !inputValue ? (
        <MenuItem
          variant='option'
          {...selectedOption}
          label={selectedLabel}
          onChange={() => {}}
          css={({ spacing }) => ({
            position: 'absolute',
            // Magic values to align the selected option with the input
            top: (hideLabel ? spacing.unit3 : spacing.unit6) + 2,
            left: spacing.unit1,
            opacity: isOpen ? 0.5 : 1
          })}
          disabled
        />
      ) : null}
      <Menu
        anchorRef={anchorRef}
        isVisible={isOpen}
        onClose={() => setIsOpen(false)}
        {...defaultMenuProps}
        PaperProps={menuProps?.PaperProps}
      >
        <MenuContent
          maxHeight={menuProps?.maxHeight}
          width={menuProps?.width}
          scrollRef={scrollRef}
          MenuListProps={menuProps?.MenuListProps}
          aria-label={selectedLabel ?? label ?? props['aria-label']}
          aria-activedescendant={selectedOption?.label}
        >
          {children
            ? children({ onChange: handleChange, options: optionElements })
            : optionElements}
        </MenuContent>
      </Menu>
    </Flex>
  )
})
