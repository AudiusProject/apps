import { FormikHelpers } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

export const MAX_COIN_DESCRIPTION_LENGTH = 2500

export type EditCoinDetailsFormValues = {
  description: string
  socialLinks: string[]
}

const messages = {
  descriptionTooLong: `Description must be ${MAX_COIN_DESCRIPTION_LENGTH} characters or less`,
  invalidUrl: 'Invalid URL format'
}

const validationSchema = z.object({
  description: z
    .string()
    .max(MAX_COIN_DESCRIPTION_LENGTH, messages.descriptionTooLong)
    .optional(),
  socialLinks: z
    .array(
      z
        .string()
        .refine(
          (value) => value === '' || z.string().url().safeParse(value).success,
          {
            message: messages.invalidUrl
          }
        )
        .optional()
    )
    .max(4, 'Maximum 4 social links allowed')
})

export const useEditCoinDetailsFormConfiguration = (
  onSubmit: (
    values: EditCoinDetailsFormValues,
    helpers: FormikHelpers<EditCoinDetailsFormValues>
  ) => void | Promise<void>,
  initialValues: EditCoinDetailsFormValues
) => {
  const formikValidationSchema = toFormikValidationSchema(validationSchema)

  return {
    initialValues,
    validateOnChange: false,
    validationSchema: formikValidationSchema,
    onSubmit
  }
}
