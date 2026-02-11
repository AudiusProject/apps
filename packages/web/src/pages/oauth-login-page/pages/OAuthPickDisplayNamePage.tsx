import { useCallback, useRef } from 'react'

import { finishProfilePageMessages } from '@audius/common/messages'
import { MAX_DISPLAY_NAME_LENGTH } from '@audius/common/services'
import { Flex, IconArrowRight, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'

import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import styles from '../OAuthLoginPage.module.css'
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
    <div className={styles.container}>
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {({ values, setFieldValue, isValid, dirty }) => (
          <Form>
            <Text variant='heading' size='m' mb='s'>
              {messages.signUpDisplayNameTitle}
            </Text>
            <Text
              variant='body'
              size='m'
              mb='l'
              css={{ color: 'var(--harmony-n-600)' }}
            >
              {messages.signUpDisplayNameDescription}
            </Text>
            <Flex direction='column' gap='xl' mb='xl'>
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
                className={styles.oauthInputLabel}
                css={{
                  '& [data-testid="helper-text"], & [class*="helper"], & p': {
                    marginTop: 'var(--harmony-unit-2)'
                  }
                }}
              />
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
              <div
                className={styles.generalErrorContainer}
                style={{ marginTop: 'var(--harmony-unit-4)' }}
              >
                <span className={styles.errorText}>{error}</span>
              </div>
            ) : null}
          </Form>
        )}
      </Formik>
    </div>
  )
}
