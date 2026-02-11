import { useCallback, useRef } from 'react'

import { createPasswordPageMessages as passwordMessages } from '@audius/common/messages'
import { passwordSchema } from '@audius/common/schemas'
import { Flex, IconArrowRight, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { PasswordField } from 'components/form-fields/PasswordField'
import { PasswordCompletionChecklist } from 'pages/sign-up-page/components/PasswordCompletionChecklist'

import { CTAButton } from '../components/CTAButton'
import { messages } from '../messages'

type OAuthCreatePasswordPageProps = {
  email: string
  onNext: (password: string) => void
}

type CreatePasswordValues = {
  password: string
  confirmPassword: string
}

const initialValues: CreatePasswordValues = {
  password: '',
  confirmPassword: ''
}

const passwordFormikSchema = toFormikValidationSchema(passwordSchema)

export const OAuthCreatePasswordPage = ({
  email,
  onNext
}: OAuthCreatePasswordPageProps) => {
  const passwordInputRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = useCallback(
    (values: CreatePasswordValues) => {
      const { password } = values
      onNext(password)
    },
    [onNext]
  )

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
        onSubmit={handleSubmit}
        validationSchema={passwordFormikSchema}
      >
        {({ isValid, dirty }) => (
          <Form>
            <Flex direction='column' gap='s' mb='xl'>
              <Text variant='heading' size='m'>
                {messages.signUpPasswordTitle}
              </Text>
              <Text variant='body' size='m' color='subdued'>
                {messages.signUpPasswordDescription}
              </Text>
            </Flex>
            <Flex direction='column' gap='l' mb='l'>
              <Flex direction='column' gap='xs'>
                <Text variant='label' size='xs'>
                  {passwordMessages.yourEmail}
                </Text>
                <Text variant='body' size='m'>
                  {email}
                </Text>
              </Flex>
              <Flex direction='column' gap='s' mt='m'>
                <PasswordField
                  name='password'
                  label={passwordMessages.passwordLabel}
                  ref={passwordInputRef}
                />
              </Flex>
              <Flex direction='column' gap='s' mt='m'>
                <PasswordField
                  name='confirmPassword'
                  label={passwordMessages.confirmPasswordLabel}
                />
              </Flex>
              <PasswordCompletionChecklist />
            </Flex>
            <CTAButton
              type='submit'
              isLoading={false}
              disabled={!(dirty && isValid)}
              iconRight={IconArrowRight}
            >
              Continue
            </CTAButton>
          </Form>
        )}
      </Formik>
    </Flex>
  )
}
