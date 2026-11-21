import { ChangeEvent, forwardRef, Ref, useCallback } from 'react'

import { useTheme } from '~harmony/foundations'
import { useControlled } from '~harmony/hooks/useControlled'

import { Flex, Box } from '../layout'

import IconIndeterminate from './Indeterminate.svg'
import IconSelect from './Select.svg'
import { CheckboxProps } from './types'

export const Checkbox = forwardRef(
  (props: CheckboxProps, ref: Ref<HTMLInputElement>) => {
    const {
      checked: checkedProp,
      defaultChecked,
      indeterminate,
      onChange,
      _isFocused,
      _isHovered,
      ...other
    } = props
    const { color, motion } = useTheme()

    const [checked, setChecked] = useControlled({
      controlledProp: checkedProp,
      defaultValue: defaultChecked,
      stateName: 'checked',
      componentName: 'Checkbox'
    })

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        onChange?.(e)
        setChecked(e.target.checked)
      },
      [onChange, setChecked]
    )

    const Icon = !checked
      ? null
      : indeterminate
        ? IconIndeterminate
        : IconSelect

    const hoverCss = {
      backgroundColor: checked ? color.secondary.s200 : color.neutral.n150
    }

    const focusCss = {
      borderRadius: 6,
      border: `2px solid ${color.border.accent}`
    }

    return (
      <Flex
        h='unit7'
        w='unit7'
        as='span'
        alignItems='center'
        justifyContent='center'
      >
        <input
          ref={ref}
          type='checkbox'
          css={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            margin: 0,
            padding: 0,
            cursor: 'pointer',
            ':hover ~ [data-span="background"]': hoverCss,
            ':focus-visible ~ [data-span="focus"]': focusCss
          }}
          data-indeterminate={indeterminate}
          checked={checked}
          onChange={handleChange}
          {...other}
        />
        <Box
          h='unit7'
          w='unit7'
          as='span'
          data-span='focus'
          css={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            ...(_isFocused && focusCss)
          }}
        />
        <Flex
          borderRadius='s'
          backgroundColor={checked ? 'accent' : 'default'}
          h='unit5'
          w='unit5'
          as='span'
          data-span='background'
          alignItems='center'
          justifyContent='center'
          css={{
            backgroundColor: checked
              ? color.background.accent
              : color.neutral.n200,
            boxShadow: 'inset 2px 2px 2px 0px rgba(0, 0, 0, 0.10)',
            transition: `background-color ${motion.hover}`,
            ...(_isHovered && hoverCss)
          }}
        >
          {Icon ? <Icon /> : null}
        </Flex>
      </Flex>
    )
  }
)
