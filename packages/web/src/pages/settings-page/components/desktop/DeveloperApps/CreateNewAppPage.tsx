import { useCallback, useEffect, useState } from 'react'

import {
  DEVELOPER_APP_DESCRIPTION_MAX_LENGTH,
  DEVELOPER_APP_IMAGE_URL_MAX_LENGTH,
  DEVELOPER_APP_NAME_MAX_LENGTH,
  developerAppSchema,
  useAddDeveloperApp
} from '@audius/common/api'
import { Button } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { TextAreaField, TextField } from 'components/form-fields'

import styles from './CreateNewAppPage.module.css'
import { CreateAppPageProps, CreateAppsPages } from './types'

type DeveloperAppValues = z.input<typeof developerAppSchema>

const messages = {
  appNameLabel: 'App Name',
  descriptionLabel: 'Short Description',
  imageUrlLabel: 'App Icon URL',
  cancel: 'Cancel',
  create: 'Create Key',
  creating: 'Creating Key',
  miscError: 'Sorry, something went wrong. Please try again later.'
}

type CreateNewAppPageProps = CreateAppPageProps

export const CreateNewAppPage = (props: CreateNewAppPageProps) => {
  const { setPage } = props

  const { data, isSuccess, isError, mutate, isPending } = useAddDeveloperApp()
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (isSuccess && data) {
      setPage(CreateAppsPages.APP_DETAILS, data)
    }
  }, [isSuccess, data, setPage])

  useEffect(() => {
    if (isError) {
      setSubmitError(messages.miscError)
    }
  }, [isError])

  const handleSubmit = useCallback(
    (values: DeveloperAppValues) => {
      setSubmitError(null)
      mutate(values)
    },
    [mutate]
  )

  const initialValues: DeveloperAppValues = {
    name: '',
    description: '',
    // Undefined unless set to pass validation
    imageUrl: undefined
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(developerAppSchema)}
    >
      {() => (
        <Form className={styles.content}>
          <TextField
            name='name'
            label={messages.appNameLabel}
            disabled={isPending}
            maxLength={DEVELOPER_APP_NAME_MAX_LENGTH}
          />
          <TextField
            name='imageUrl'
            label={messages.imageUrlLabel}
            disabled={isPending}
            maxLength={DEVELOPER_APP_IMAGE_URL_MAX_LENGTH}
          />
          <TextAreaField
            name='description'
            placeholder={messages.descriptionLabel}
            showMaxLength
            maxLength={DEVELOPER_APP_DESCRIPTION_MAX_LENGTH}
            disabled={isPending}
          />
          <div className={styles.actionsContainer}>
            <Button
              variant='secondary'
              type='button'
              fullWidth
              disabled={isPending}
              onClick={() => setPage(CreateAppsPages.YOUR_APPS)}
            >
              {messages.cancel}
            </Button>
            <Button
              variant='primary'
              type='submit'
              fullWidth
              isLoading={isPending}
            >
              {isPending ? messages.creating : messages.create}
            </Button>
          </div>
          {submitError == null ? null : (
            <div className={styles.errorContainer}>
              <span className={styles.errorText}>{messages.miscError}</span>
            </div>
          )}
        </Form>
      )}
    </Formik>
  )
}
