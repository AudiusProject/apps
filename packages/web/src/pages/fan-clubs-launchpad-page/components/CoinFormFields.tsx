import type { LaunchpadFormValues } from '@audius/common/models'
import { Flex, TextInput } from '@audius/harmony'
import { useFormikContext } from 'formik'

import { useLaunchpadAnalytics } from '../utils'

const messages = {
  coinName: 'Coin Name',
  coinSymbol: 'Coin Symbol'
}

export const CoinFormFields = () => {
  const { values, errors, touched, handleChange, handleBlur } =
    useFormikContext<LaunchpadFormValues>()

  const { trackFormInputChange } = useLaunchpadAnalytics()

  const handleBlurWithAnalytics =
    (name: keyof LaunchpadFormValues) =>
    (event: React.FocusEvent<HTMLInputElement>) => {
      handleBlur(event)
      trackFormInputChange(name, event.target.value)
    }

  return (
    <Flex gap='xl' w='100%'>
      <Flex direction='column' w='100%'>
        <TextInput
          label={messages.coinName}
          name='coinName'
          value={values.coinName}
          onChange={handleChange}
          onBlur={handleBlurWithAnalytics('coinName')}
          error={!!(touched.coinName && errors.coinName)}
          helperText={touched.coinName ? errors.coinName : undefined}
          maxLength={30}
        />
      </Flex>
      <Flex direction='column' w='100%'>
        <TextInput
          label={messages.coinSymbol}
          name='coinSymbol'
          value={values.coinSymbol}
          onChange={handleChange}
          onBlur={handleBlurWithAnalytics('coinSymbol')}
          error={!!(touched.coinSymbol && errors.coinSymbol)}
          helperText={touched.coinSymbol ? errors.coinSymbol : undefined}
          startAdornmentText='$'
          maxLength={10}
          css={{ '& input': { textTransform: 'uppercase' } }}
        />
      </Flex>
    </Flex>
  )
}
