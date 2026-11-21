import { useState } from 'react'

import { MUSICAL_KEYS } from '@audius/common/utils'
import { Box, Divider, Flex, SegmentedControl, Select } from '@audius/harmony'
import { useField } from 'formik'

const messages = {
  key: 'Key'
}

type KeySelectFieldProps = {
  name: string
}

const getValueFromKey = (key: string) =>
  key.includes('/') ? key.split('/')[1] : key

export const KeySelectField = (props: KeySelectFieldProps) => {
  const { name } = props
  const [field, { touched, error }, { setValue }] = useField(name)
  const key = field.value

  const hasError = Boolean(touched && error)

  const [scale, setScale] = useState<'Major' | 'Minor'>(
    key?.split(' ')[1] ?? 'Major'
  )
  const keyOptions = MUSICAL_KEYS.map((key) => {
    return {
      label: key,
      value: `${getValueFromKey(key)} ${scale}`
    }
  })

  return (
    <Select
      readOnly
      value={key}
      label={messages.key}
      options={keyOptions}
      error={hasError}
      helperText={hasError ? error : undefined}
      renderSelectedOptionLabel={(option) => `${option.label} ${scale}`}
      onChange={setValue}
      menuProps={{ PaperProps: { css: { minWidth: 200 } } }}
    >
      {({ options }) => (
        <>
          <Box w='100%' ph='s'>
            <SegmentedControl
              fullWidth
              options={[
                { key: 'Major', text: 'Major' },
                { key: 'Minor', text: 'Minor' }
              ]}
              selected={scale}
              onSelectOption={setScale}
            />
          </Box>
          <Divider css={{ width: '100%' }} />
          <Flex direction='column' w='100%' ph='s'>
            {options}
          </Flex>
        </>
      )}
    </Select>
  )
}
