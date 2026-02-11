import { useCallback, useRef } from 'react'

import { finishProfilePageMessages } from '@audius/common/messages'
import { MAX_DISPLAY_NAME_LENGTH } from '@audius/common/services'
import { Flex, IconArrowRight, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'

import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import { CTAButton } from '../components/CTAButton'
import { messages } from '../messages'

type OAuthPickDisplayNamePageProps = {
  handle: string
  onNext: (displayName: string) => void
  isCreatingAccount: boolean
  error: string | null
}

type PickDisplayNameValues = {
  displayName: string
}

export const OAuthPickDisplayNamePage = ({
  handle,
  onNext,
  isCreatingAccount,
  error
}: OAuthPickDisplayNamePageProps) => {
  const displayNameInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(
    ({ displayName }: PickDisplayNameValues) => {
      onNext(displayName.trim())
    },
    [onNext]
  )

  const initialValues: PickDisplayNameValues = {
    displayName: ''
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
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {({ values, setFieldValue, isValid, dirty }) => (
          <Form>
            <Flex direction='column' gap='s' mb='l'>
              <Text variant='heading' size='m'>
                {messages.signUpDisplayNameTitle}
              </Text>
              <Text variant='body' size='m' color='subdued'>
                {messages.signUpDisplayNameDescription}
              </Text>
            </Flex>
            <Flex direction='column' gap='xl' mb='xl'>
              <Flex direction='column' gap='s' mt='m'>
                <HarmonyTextField
                  ref={displayNameInputRef}
                  name='displayName'
                  label={finishProfilePageMessages.displayName}
                  placeholder={finishProfilePageMessages.inputPlaceholder}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  onChange={(e) =>
                    setFieldValue('displayName', e.currentTarget.value)
                  }
                  value={values.displayName}
                />
              </Flex>
            </Flex>
            {isCreatingAccount ? (
              <Flex direction='column' alignItems='center' gap='l'>
                <LoadingSpinner />
                <Text variant='body' size='m'>
                  {messages.creatingAccount}
                </Text>
              </Flex>
            ) : (
              <CTAButton
                type='submit'
                isLoading={false}
                disabled={!isValid || !dirty || !values.displayName.trim()}
                iconRight={IconArrowRight}
              >
                Create Account
              </CTAButton>
            )}
            {error ? (
              <Flex direction='column' alignItems='center' mt='l'>
                <Text
                  variant='body'
                  size='m'
                  color='danger'
                  css={{ fontWeight: 'bold' }}
                >
                  {error}
                </Text>
              </Flex>
            ) : null}
          </Form>
        )}
      </Formik>
    </Flex>
  )
}
