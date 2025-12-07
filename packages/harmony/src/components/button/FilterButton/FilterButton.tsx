import {
  forwardRef,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  Ref
} from 'react'

import { CSSObject, useTheme } from '@emotion/react'
import { mergeRefs } from 'react-merge-refs'

import { BaseButton } from '~harmony/components/button/BaseButton/BaseButton'
import { IconComponent, IconProps } from '~harmony/components/icon'
import { TextInput, TextInputSize } from '~harmony/components/input/TextInput'
import { Menu, MenuContent } from '~harmony/components/internal/Menu'
import { Flex, Box } from '~harmony/components/layout'
import { Text } from '~harmony/components/text/Text'
import { useControlled } from '~harmony/hooks/useControlled'
import { IconCaretDown, IconCloseAlt, IconSearch } from '~harmony/icons'

import { OptionsList, VirtualizedOptionsList } from './FilterButtonOptionsList'
import { FilterButtonProps } from './types'

const messages = {
  noMatches: 'No matches'
}

export const FilterButton = forwardRef(function FilterButton<
  Value extends string
>(props: FilterButtonProps<Value>, ref: Ref<HTMLButtonElement>) {
  const {
    value: valueProp,
    children,
    label,
    onChange,
    onClick,
    onOpen,
    onReset,
    disabled,
    variant = 'fillContainer',
    size = 'default',
    iconRight,
    leadingElement: leadingElementProp,
    menuProps,
    options,
    showFilterInput,
    filterInputProps,
    optionsLabel,
    renderLabel = (label) => label,
    virtualized
  } = props
  const { color, cornerRadius, spacing, typography } = useTheme()
  const [value, setValue] = useControlled({
    controlledProp: valueProp,
    defaultValue: null,
    stateName: 'value',
    componentName: 'FilterButton'
  })

  const [isOpen, setIsOpen] = useState(false)
  const [filterInputValue, setFilterInputValue] = useState('')
  const selectedOption = options?.find((option) => option.value === value)
  const selectedLabel = selectedOption?.label ?? selectedOption?.value
  const leadingElement = leadingElementProp ?? selectedOption?.leadingElement
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const optionRefs = useRef<HTMLButtonElement[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Size Styles
  const defaultStyles: CSSObject = {
    paddingLeft: spacing.m,
    paddingRight: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.s
  }
  const defaultIconStyles: CSSObject = {
    width: spacing.unit4,
    height: spacing.unit4
  }

  const smallStyles: CSSObject = {
    paddingLeft: spacing.m,
    paddingRight: spacing.m,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs
  }
  const smallIconStyles: CSSObject = {
    width: spacing.unit3,
    height: spacing.unit3
  }

  const fillContainerStyles: CSSObject = {
    background: color.secondary.s400,
    border: `1px solid ${color.secondary.s400}`,
    '&:hover': {
      border: `1px solid ${color.secondary.s400}`
    }
  }

  const hoverStyle = {
    background: color.background.surface1
  }

  const activeStyle = {
    background: color.background.surface2
  }
  const disabledTransform = {
    transform: 'none'
  }

  // Button Styles
  const buttonCss: CSSObject = {
    background: color.background.white,
    border: `1px solid ${color.border.strong}`,
    borderRadius: cornerRadius.s,
    color:
      variant === 'fillContainer' && value !== null
        ? color.static.white
        : color.text.default,
    gap: spacing.xs,
    fontSize: typography.size.s,
    fontWeight: typography.weight.demiBold,
    lineHeight: typography.lineHeight.s,
    opacity: disabled ? 0.6 : 1,

    '&:hover': {
      ...disabledTransform,
      ...(value === null && !isOpen ? hoverStyle : {})
    },
    '&:focus': {
      ...disabledTransform,
      ...(value === null ? activeStyle : {})
    },
    '&:active': {
      ...disabledTransform,
      ...(value === null ? activeStyle : {})
    },
    ...(isOpen ? activeStyle : {}),

    ...(size === 'small' ? smallStyles : defaultStyles),
    ...(variant === 'fillContainer' && value !== null
      ? fillContainerStyles
      : {})
  }

  const iconCss = size === 'small' ? smallIconStyles : defaultIconStyles

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick()
    } else {
      setIsOpen((isOpen: boolean) => !isOpen)
      if (!isOpen) {
        setFilterInputValue('')
      }
    }
  }, [isOpen, onClick])

  const hasOptions = options && options.length > 0

  const Icon = useMemo(() => {
    return variant === 'fillContainer' && value !== null
      ? (((props: IconProps) => (
          <IconCloseAlt
            aria-label='cancel'
            onClick={(e: React.MouseEvent<SVGSVGElement>) => {
              e.stopPropagation()
              if (onClick) {
                onClick()
              } else {
                // @ts-ignore
                onChange?.(null)
                onReset?.()
              }
            }}
            {...props}
          />
        )) as IconComponent)
      : (iconRight ?? (hasOptions ? IconCaretDown : null))
  }, [variant, value, iconRight, hasOptions, onClick, onChange, onReset])

  useEffect(() => {
    if (isOpen) {
      // Focus the input after the popup is open
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true })
      }, 0)
      onOpen?.()
    }
  }, [isOpen, onOpen])

  const handleChange = useCallback(
    (value: Value) => {
      setValue(value)
      onChange?.(value)
    },
    [onChange, setValue]
  )

  const handleOptionSelected = useCallback(
    (value: Value) => {
      handleChange(value)
      setIsOpen(false)
    },
    [handleChange]
  )

  const filteredOptions = useMemo(
    () =>
      options?.filter(
        ({ label }) =>
          !filterInputValue ||
          label?.toLowerCase().includes(filterInputValue.toLowerCase())
      ),
    [options, filterInputValue]
  )

  const optionElements = filteredOptions ? (
    virtualized ? (
      <VirtualizedOptionsList
        options={filteredOptions}
        optionRefs={optionRefs}
        onChange={handleOptionSelected}
        height={menuProps?.maxHeight}
        width={menuProps?.width}
      />
    ) : (
      <OptionsList
        options={filteredOptions}
        isOpen={isOpen}
        optionRefs={optionRefs}
        scrollRef={scrollRef}
        onChange={handleOptionSelected}
      />
    )
  ) : null

  return (
    <BaseButton
      ref={mergeRefs([ref, anchorRef])}
      styles={{ button: buttonCss, icon: iconCss }}
      onClick={handleClick}
      iconRight={Icon}
      disabled={disabled}
      aria-haspopup='listbox'
      aria-expanded={isOpen}
    >
      {leadingElement}
      {selectedLabel ? renderLabel(selectedLabel) : label}

      <Menu
        anchorRef={anchorRef}
        isVisible={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={menuProps?.PaperProps}
      >
        {children ? (
          <Flex onClick={(e) => e.stopPropagation()}>
            {children({
              onChange: handleChange,
              options: optionElements,
              setIsOpen
            })}
          </Flex>
        ) : (
          <MenuContent
            maxHeight={menuProps?.maxHeight}
            width={menuProps?.width}
            scrollRef={scrollRef}
            MenuListProps={menuProps?.MenuListProps}
            aria-label={selectedLabel ?? label ?? props['aria-label']}
            aria-activedescendant={selectedLabel}
          >
            {showFilterInput && filterInputProps ? (
              <TextInput
                ref={inputRef}
                size={TextInputSize.SMALL}
                startIcon={IconSearch}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  setFilterInputValue(e.target.value)
                }}
                autoComplete='off'
                {...filterInputProps}
              />
            ) : null}
            {optionsLabel ? (
              <Box pt='s' ph='m'>
                <Text variant='label' size='xs'>
                  {optionsLabel}
                </Text>
              </Box>
            ) : null}
            {filteredOptions && filteredOptions.length === 0 ? (
              <Flex justifyContent='center'>
                <Text variant='body' color='subdued' size='s'>
                  {messages.noMatches}
                </Text>
              </Flex>
            ) : (
              <Flex direction='column' w='100%'>
                {optionElements}
              </Flex>
            )}
          </MenuContent>
        )}
      </Menu>
    </BaseButton>
  )
})
