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
  const handleInputRef = useRef<HTMLInputElement | null>(null)

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
    <Flex
      direction='column'
      w='375px'
      ph='l'
      pt='4xl'
      css={{
        '@media (max-width: 375px)': {
          width: '100%'
        }
      }}
    >
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
    </Flex>
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
  inputRef: React.RefObject<HTMLInputElement | null>
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
      <Flex direction='column' gap='s' mb='l'>
        <Text variant='heading' size='m'>
          {messages.signUpHandleTitle}
        </Text>
        <Text variant='body' size='m' color='subdued'>
          {messages.signUpHandleDescription}
        </Text>
      </Flex>
      <Flex direction='column' gap='xl' mb='xl'>
        <Flex direction='column' gap='s' mt='m'>
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
          />
        </Flex>
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
