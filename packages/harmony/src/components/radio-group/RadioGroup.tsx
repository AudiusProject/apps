import { ChangeEvent, ReactNode, useCallback, useRef } from 'react'

import { useControlled } from '../../hooks/useControlled'
import { Flex, FlexProps } from '../layout'

import { RadioGroupContext } from './RadioGroupContext'

export type RadioGroupProps = {
  name: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  children?: ReactNode
  defaultValue?: string
  value?: string | null
} & FlexProps

export const RadioGroup = (props: RadioGroupProps) => {
  const {
    name,
    onChange,
    children,
    value: valueProp,
    defaultValue,
    ...other
  } = props
  const [value, setValueState] = useControlled({
    controlledProp: valueProp,
    defaultValue,
    componentName: 'RadioButtonGroup'
  })

  const isChanging = useRef(false)

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (isChanging.current) return

      isChanging.current = true
      setValueState(e.target.value)
      onChange?.(e)

      requestAnimationFrame(() => {
        isChanging.current = false
      })
    },
    [setValueState, onChange]
  )
  return (
    <RadioGroupContext.Provider value={{ name, onChange: handleChange, value }}>
      <Flex role='radiogroup' direction='column' {...other}>
        {children}
      </Flex>
    </RadioGroupContext.Provider>
  )
}
