import { useCallback, useMemo, useRef } from 'react'

import { useQueryContext } from '@audius/common/api'
import { useIsWaitingForValidation } from '@audius/common/hooks'
import { pickHandlePageMessages as handleMessages } from '@audius/common/messages'
import { pickHandleSchema } from '@audius/common/schemas'
import { MAX_HANDLE_LENGTH } from '@audius/common/services'
import { Flex, IconArrowRight, IconCheck, Text } from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import { restrictedHandles } from 'utils/restrictedHandles'

import styles from '../OAuthLoginPage.module.css'
import { CTAButton } from '../components/CTAButton'
import { messages } from '../messages'

type OAuthPickHandlePageProps = {
  onNext: (handle: string) => void
}

type PickHandleValues = {
  handle: string
}

export const OAuthPickHandlePage = ({ onNext }: OAuthPickHandlePageProps) => {
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const handleInputRef = useRef<HTMLInputElement>(null)

  const validationSchema = useMemo(
    () =>
      toFormikValidationSchema(
        pickHandleSchema({ queryContext, queryClient, restrictedHandles })
      ),
    [queryContext, queryClient]
  )

  const handleSubmit = useCallback(
    (values: PickHandleValues) => {
      const { handle } = values
      onNext(handle)
    },
    [onNext]
  )

  const initialValues: PickHandleValues = {
    handle: ''
  }

  return (
    <div className={styles.container}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        validateOnChange={false}
      >
        {({ isValid, values, setFieldValue, errors }) => {
          const formatHandleValue = (value: string) => value.replace(/\s/g, '')

          return (
            <HandleFieldContent
              handle={values.handle}
              error={errors.handle}
              onHandleChange={(value) =>
                setFieldValue('handle', formatHandleValue(value))
              }
              isValid={isValid}
              inputRef={handleInputRef}
            />
          )
        }}
      </Formik>
    </div>
  )
}

const HandleFieldContent = ({
  handle,
  error,
  onHandleChange,
  isValid,
  inputRef
}: {
  handle: string
  error?: string
  onHandleChange: (value: string) => void
  isValid: boolean
  inputRef: React.RefObject<HTMLInputElement>
}) => {
  const { isWaitingForValidation, handleChange } = useIsWaitingForValidation()

  const helperText = (() => {
    if (!handle) return null
    if (error) return error
    if (!isWaitingForValidation) return handleMessages.handleAvailable
    return null
  })()

  const formatHandleValue = (value: string) => value.replace(/\s/g, '')

  return (
    <Form>
      <Text variant='heading' size='m' mb='s'>
        {messages.signUpHandleTitle}
      </Text>
      <Text
        variant='body'
        size='m'
        mb='l'
        css={{ color: 'var(--harmony-n-600)' }}
      >
        {messages.signUpHandleDescription}
      </Text>
      <Flex direction='column' gap='xl' mb='xl'>
        <HarmonyTextField
          ref={inputRef}
          name='handle'
          label={handleMessages.handle}
          helperText={helperText ?? undefined}
          maxLength={MAX_HANDLE_LENGTH}
          startAdornmentText='@'
          placeholder={handleMessages.handle}
          transformValueOnChange={formatHandleValue}
          debouncedValidationMs={1000}
          error={!!error}
          value={handle}
          endIcon={
            !isWaitingForValidation && !error && handle ? IconCheck : undefined
          }
          IconProps={{ size: 'l', color: 'default' }}
          onChange={(e) => {
            onHandleChange(e.currentTarget.value)
            handleChange()
          }}
          className={styles.oauthInputLabel}
          css={{
            '& [data-testid="helper-text"], & [class*="helper"], & p': {
              marginTop: 'var(--harmony-unit-2)'
            }
          }}
        />
      </Flex>
      <CTAButton
        type='submit'
        isLoading={false}
        disabled={!isValid || !handle}
        iconRight={IconArrowRight}
      >
        Continue
      </CTAButton>
    </Form>
  )
}
