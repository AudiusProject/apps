import { advancedAlbumMessages as messages } from '@audius/common/messages'
import { Nullable } from '@audius/common/utils'
import {
  Divider,
  Flex,
  IconIndent,
  IconInfo,
  Text,
  Tooltip
} from '@audius/harmony'
import { useField } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  ContextualMenu,
  SelectedValue
} from 'components/data-entry/ContextualMenu'
import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'

import { DatePickerField } from './DatePickerField'

type AdvancedAlbumFieldValues = {
  upc: Nullable<string>
  release_date: Nullable<string>
}

const advancedSchema = z.object({
  upc: z
    .optional(z.string().regex(/^\d{12,13}$/, messages.upcInputError))
    .nullable(),
  release_date: z.optional(z.string()).nullable()
})

export const AdvancedAlbumField = () => {
  const [{ value: upc }, , { setValue: setUpc }] = useField('upc')
  const [{ value: isHidden }] = useField('is_private')
  const [{ value: release_date }, , { setValue: setReleaseDate }] =
    useField('release_date')

  return (
    <ContextualMenu
      icon={<IconIndent />}
      label={messages.title}
      description={messages.description}
      initialValues={{ upc, release_date }}
      validationSchema={toFormikValidationSchema(advancedSchema)}
      onSubmit={(values: AdvancedAlbumFieldValues) => {
        const { upc, release_date } = values
        setUpc(upc)
        setReleaseDate(release_date)
      }}
      renderValue={() =>
        upc ? <SelectedValue label={`${messages.upcValue} ${upc}`} /> : null
      }
      menuFields={
        <Flex direction='column' gap='xl'>
          <Flex direction='column' gap='l'>
            <Flex gap='s' alignItems='center'>
              <Text variant='title' size='l'>
                {messages.upcTitle}
              </Text>
              <Tooltip text={messages.upcDescription} placement='bottom'>
                <IconInfo size='s' color='subdued' />
              </Tooltip>
            </Flex>
            <HarmonyTextField
              name='upc'
              label={messages.upcInputLabel}
              transformValueOnChange={(value) => value.replace(/\D/g, '')}
              maxLength={13}
            />
          </Flex>
          {isHidden ? null : (
            <>
              <Divider />
              <Flex direction='column' gap='l'>
                <Text variant='title' size='l'>
                  {messages.releaseDate.title}
                </Text>
                <DatePickerField
                  name='release_date'
                  label={messages.releaseDate.label}
                />
              </Flex>
            </>
          )}
        </Flex>
      }
    />
  )
}
