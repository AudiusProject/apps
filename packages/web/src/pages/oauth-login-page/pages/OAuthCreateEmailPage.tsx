import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchema, emailSchemaMessages } from '@audius/common/schemas'
import {
  Divider,
  Flex,
  Hint,
  IconArrowRight,
  IconEmbed,
  IconError,
  IconTransaction,
  Text
} from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik, useField } from 'formik'
import { Link, useLocation } from 'react-router'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import AppIcon from 'assets/img/appIcon.png'
import Input from 'components/data-entry/Input'
import { identify } from 'services/analytics'

import { CTAButton } from '../components/CTAButton'
import { messages } from '../messages'

type OAuthCreateEmailPageProps = {
  appName?: string | string[] | null
  appImage?: string
  onNext: (email: string) => void
}

type SignUpEmailValues = {
  email: string
}

export const OAuthCreateEmailPage = ({
  appName,
  appImage,
  onNext
}: OAuthCreateEmailPageProps) => {
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const location = useLocation()

  const EmailSchema = useMemo(
    () => toFormikValidationSchema(emailSchema(queryContext, queryClient)),
    [queryContext, queryClient]
  )

  const initialValues: SignUpEmailValues = {
    email: ''
  }

  const handleSubmit = useCallback(
    async (values: SignUpEmailValues) => {
      const { email } = values
      identify({
        email
      })
      onNext(email)
    },
    [onNext]
  )

  const signInLink = (
    <Link
      to={`/oauth/auth${location.search}`}
      style={{ color: 'var(--harmony-primary)', textDecoration: 'none' }}
    >
      {createEmailPageMessages.signIn}
    </Link>
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
      <Flex alignItems='center' direction='column' mb='l'>
        <Flex gap='l' alignItems='center' mb='l'>
          <Flex h='88px' w='88px'>
            <img src={AppIcon} alt='Audius Logo' />
          </Flex>
          <IconTransaction color='default' />
          <Flex h='88px' w='88px' borderRadius='l' css={{ overflow: 'hidden' }}>
            {appImage ? (
              <img src={appImage} alt={`${appName} Image`} />
            ) : (
              <Flex
                w='100%'
                justifyContent='center'
                alignItems='center'
                borderRadius='l'
                css={{ backgroundColor: 'var(--harmony-n-200)' }}
              >
                <IconEmbed color='subdued' size='xl' />
              </Flex>
            )}
          </Flex>
        </Flex>
        <Text variant='body' size='l'>{`${messages.allow}:`}</Text>
        <Text variant='heading' size='s'>
          {appName}
        </Text>
      </Flex>
      <Flex direction='column' pb='4xl'>
        <Divider color='default' />
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={EmailSchema}
          validateOnChange={false}
          validateOnBlur={true}
        >
          {({ isSubmitting, setFieldValue }) => (
            <Form>
              <Flex direction='column' gap='l' mt='2xl'>
                <Text variant='heading' size='m'>
                  {messages.signUpEmailTitle}
                </Text>
                <Text variant='body' size='m' color='subdued'>
                  {messages.signUpEmailDescription}
                </Text>
              </Flex>
              <EmailInputWithError setFieldValue={setFieldValue} />
              <CTAButton
                type='submit'
                isLoading={isSubmitting}
                iconRight={IconArrowRight}
              >
                Continue
              </CTAButton>
              <Flex direction='column' alignItems='center' mt='l'>
                <Text variant='body' size='s' textAlign='center'>
                  {createEmailPageMessages.haveAccount} {signInLink}
                </Text>
              </Flex>
            </Form>
          )}
        </Formik>
      </Flex>
    </Flex>
  )
}

const EmailInputWithError = ({
  setFieldValue
}: {
  setFieldValue: (field: string, value: string) => void
}) => {
  const location = useLocation()
  const [field, { error, touched }] = useField('email')
  const emailInUse = error === emailSchemaMessages.emailInUse

  const signInLink = (
    <Link
      to={`/oauth/auth${location.search}`}
      style={{ color: 'var(--harmony-primary)', textDecoration: 'none' }}
    >
      {createEmailPageMessages.signIn}
    </Link>
  )

  return (
    <Flex direction='column' gap='s' mt='s'>
      {/* @ts-ignore */}
      <Input
        placeholder='Email'
        size='medium'
        type='email'
        name='email'
        id='email-input'
        autoComplete='username'
        value={field.value}
        onChange={(value: string) => {
          setFieldValue('email', value)
        }}
        onBlur={field.onBlur}
      />
      {touched && error && emailInUse ? (
        <Hint icon={IconError}>
          {error} {signInLink}
        </Hint>
      ) : touched && error ? (
        <Hint icon={IconError}>{error}</Hint>
      ) : null}
    </Flex>
  )
}
