import { useEffect } from 'react'

import { visibilityMessages } from '@audius/common/messages'
import { Box, Flex, Hint } from '@audius/harmony'
import dayjs from 'dayjs'
import { useField, useFormikContext } from 'formik'

import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import { SelectField } from 'components/form-fields/SelectField'
import { getLocalTimezone } from 'utils/dateUtils'

import { DatePickerField } from '../DatePickerField'

const messages = {
  ...visibilityMessages,
  meridianLabel: 'Meridian',
  meridianPlaceholder: 'AM'
}

export const ScheduledReleaseDateField = () => {
  const [{ value: releaseDate }, { touched }] = useField('releaseDate')
  const { setFieldValue } = useFormikContext()

  useEffect(() => {
    if (releaseDate && touched && dayjs().isSame(dayjs(releaseDate), 'day')) {
      setFieldValue('releaseDateTime', '11:59')
      setFieldValue('releaseDateMeridian', 'PM')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseDate, touched])

  return (
    <Flex direction='column' gap='l'>
      <Flex gap='l'>
        <DatePickerField
          name='releaseDate'
          label={messages.dateLabel}
          futureDatesOnly
        />
        <Flex gap='l'>
          <Box>
            <HarmonyTextField
              name='releaseDateTime'
              label={messages.timeLabel}
              transformValueOnBlur={(value) => {
                if (value.includes(':')) {
                  return value
                }
                const number = parseInt(value, 10)
                if (!isNaN(number) && number >= 1 && number <= 12) {
                  return `${number}:00`
                }
                return value
              }}
            />
          </Box>
          <Box>
            <SelectField
              label={messages.meridianLabel}
              placeholder={messages.meridianPlaceholder}
              hideLabel
              name='releaseDateMeridian'
              options={[
                { value: 'AM', label: 'AM' },
                { value: 'PM', label: 'PM' }
              ]}
            />
          </Box>
        </Flex>
      </Flex>
      {releaseDate && touched ? (
        <Hint>{messages.futureReleaseHint(getLocalTimezone())}</Hint>
      ) : null}
    </Flex>
  )
}
