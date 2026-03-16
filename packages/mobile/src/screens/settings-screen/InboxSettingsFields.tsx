import { useCallback } from 'react'

import type { InboxSettingsFormValues } from '@audius/common/store'
import { ChatPermission } from '@audius/sdk/services'
import { useField, useFormikContext } from 'formik'

import { Text, Flex } from '@audius/harmony-native'
import { Switch } from 'app/components/core'

const messages = {
  allowAll: 'Allow Messages from Everyone',
  followeeTitle: 'People You Follow',
  followersTitle: 'Your Followers',
  verifiedTitle: 'Verified Users'
}

const options = [
  {
    title: messages.followeeTitle,
    value: ChatPermission.FOLLOWEES
  },
  {
    title: messages.followersTitle,
    value: ChatPermission.FOLLOWERS
  },
  {
    title: messages.verifiedTitle,
    value: ChatPermission.VERIFIED
  }
]

export const InboxSettingsFields = () => {
  const { values, setValues } = useFormikContext<InboxSettingsFormValues>()
  const [allowAllField] = useField({
    name: 'all',
    type: 'checkbox'
  })

  const handleAllChange = useCallback(
    (isChecked: boolean) => {
      let newValues = {
        ...values,
        all: isChecked
      }
      if (isChecked) {
        newValues = options.reduce((acc, opt) => {
          acc[opt.value as keyof InboxSettingsFormValues] = true
          return acc
        }, newValues)
      }
      setValues(newValues)
    },
    [setValues, values]
  )

  return (
    <Flex gap='xl'>
      <Flex gap='l' row alignItems='center'>
        <Switch value={allowAllField.value} onValueChange={handleAllChange} />
        <Text variant='title' strength='weak' size='l'>
          {messages.allowAll}
        </Text>
      </Flex>
      <Flex
        column
        p='l'
        gap='l'
        border='default'
        borderRadius='m'
        style={{ opacity: allowAllField.checked ? 0.5 : 1 }}
      >
        {options.map((opt) => (
          <SwitchField key={opt.title} {...opt} />
        ))}
      </Flex>
    </Flex>
  )
}

function SwitchField(props: { title: string; value: ChatPermission }) {
  const { title, value } = props
  const [allowAllField] = useField({ name: 'all', type: 'checkbox' })

  const [field, , { setValue }] = useField({
    name: value,
    type: 'checkbox'
  })

  return (
    <Flex row gap='l' key={title}>
      <Switch
        id={title}
        value={field.checked}
        disabled={allowAllField.checked}
        onValueChange={(value) => {
          setValue(value)
        }}
      />
      <Text variant='title' strength='weak'>
        {title}
      </Text>
    </Flex>
  )
}
