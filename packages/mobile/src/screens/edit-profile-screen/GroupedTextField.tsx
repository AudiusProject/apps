import { useField } from 'formik'
import type { TextInputProps } from 'react-native'
import { TextInput } from 'react-native'

import type { IconComponent } from '@audius/harmony-native'
import { Flex, Text, useTheme } from '@audius/harmony-native'

const LABEL_WIDTH = 116

type GroupedTextFieldProps = Omit<TextInputProps, 'value'> & {
  name: string
  label: string
  icon?: IconComponent
  /** Fixed text before the value, like the @ on a handle. */
  prefix?: string
}

/** A row in a `FormGroup`: label on the left, the input filling the rest. */
export const GroupedTextField = (props: GroupedTextFieldProps) => {
  const { name, label, icon: Icon, prefix, multiline, ...other } = props
  const { color, typography, spacing } = useTheme()
  const [{ value, onChange, onBlur }, { error, touched }] =
    useField<string>(name)

  const inputStyle = {
    flex: 1,
    padding: 0,
    fontFamily: typography.fontByWeight.medium,
    fontSize: typography.size.l,
    // Match the label's line box so the two share a baseline on Android
    lineHeight: typography.lineHeight.l,
    includeFontPadding: false,
    color: color.text.default
  }

  return (
    <Flex gap='2xs' ph='l' pv={multiline ? 'm' : undefined}>
      <Flex
        row
        alignItems={multiline ? 'flex-start' : 'center'}
        gap='s'
        style={{ minHeight: multiline ? undefined : 50 }}
      >
        <Flex row alignItems='center' gap='s' style={{ width: LABEL_WIDTH }}>
          {Icon ? <Icon size='s' color='default' /> : null}
          <Text variant='body' size='l' color='subdued'>
            {label}
          </Text>
        </Flex>
        {prefix ? (
          <Text variant='body' size='l' color='subdued'>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value ?? ''}
          onChangeText={onChange(name)}
          onBlur={onBlur(name)}
          multiline={multiline}
          placeholderTextColor={color.text.subdued}
          accessibilityLabel={label}
          style={[
            inputStyle,
            multiline
              ? { minHeight: 66, paddingTop: 0, textAlignVertical: 'top' }
              : null
          ]}
          {...other}
        />
      </Flex>
      {error && touched ? (
        <Text
          variant='body'
          size='xs'
          color='danger'
          style={{ marginLeft: LABEL_WIDTH + spacing.s }}
        >
          {error}
        </Text>
      ) : null}
    </Flex>
  )
}
