import { ChangeEvent, ComponentProps, PropsWithChildren } from 'react'

import { Flex, IconInfo, Switch, Text, Tooltip } from '@audius/harmony'
import { useField } from 'formik'

type ToggleFieldProps = PropsWithChildren & {
  name: string
  header: string
  description?: string
  inverted?: boolean
  tooltipText?: string
} & Partial<ComponentProps<'input'>>

export const SwitchRowField = (props: ToggleFieldProps) => {
  const {
    name,
    header,
    description,
    inverted,
    tooltipText,
    children,
    ...inputOverrides
  } = props

  const [field] = useField({ name, type: 'checkbox' })

  const onChange = inverted
    ? (e: ChangeEvent<HTMLInputElement>) => {
        const modifiedEvent = { ...e }
        modifiedEvent.target.checked = !e.target.checked
        modifiedEvent.target.value =
          e.target.value === 'true' ? 'false' : 'true'
        field.onChange(modifiedEvent)
      }
    : field.onChange

  const inputId = `${name}-id`
  const descriptionId = `${name}-description`

  return (
    <Flex justifyContent='space-between'>
      <Flex column gap='l' w='100%'>
        <Text tag='label' htmlFor={inputId} variant='title' size='l'>
          {header}
        </Text>
        {description ? (
          <Flex gap='s' alignItems='center'>
            <Text id={descriptionId} variant='body'>
              {description}
            </Text>
            {tooltipText ? (
              <Tooltip text={tooltipText}>
                <IconInfo size='s' color='default' />
              </Tooltip>
            ) : null}
          </Flex>
        ) : null}
        {(inverted ? !field.checked : field.checked) ? children : null}
      </Flex>
      <Switch
        {...field}
        id={inputId}
        aria-describedby={descriptionId}
        checked={inverted ? !field.checked : field.checked}
        onChange={onChange}
        {...inputOverrides}
      />
    </Flex>
  )
}
