import { Checkbox, Flex, Text } from '@audius/harmony'
import { useField } from 'formik'

export const SetupConfirmation = () => {
  const [field, meta, helpers] = useField<boolean>('setupConfirmation')

  return (
    <Flex direction='column' gap='xs'>
      <Flex gap='s' alignItems='center'>
        <Checkbox
          name={field.name}
          checked={field.value}
          onBlur={field.onBlur}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            helpers.setValue(event.target.checked)
            helpers.setTouched(true, false)
          }}
        />
        <Text variant='body' size='m' color='default'>
          I have carefully reviewed my Artist Coin details, and understand they
          are permanent and{' '}
          <Text strength='strong'>cannot be changed later</Text>.
        </Text>
      </Flex>
      {meta.error && meta.touched ? (
        <Text variant='body' size='s' color='danger'>
          {meta.error}
        </Text>
      ) : null}
    </Flex>
  )
}
