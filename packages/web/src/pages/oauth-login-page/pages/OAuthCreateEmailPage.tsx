import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchema, emailSchemaMessages } from '@audius/common/schemas'
import {
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

import styles from '../OAuthLoginPage.module.css'
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
    <div className={styles.container}>
      <Flex alignItems='center' direction='column'>
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
                <IconEmbed
                  color='subdued'
                  css={{ width: '48px', height: '48px' }}
                />
              </Flex>
            )}
          </Flex>
        </Flex>
        <Text variant='body' size='l'>{`${messages.allow}:`}</Text>
        <Text variant='heading' size='s'>
          {appName}
        </Text>
      </Flex>
      <div className={styles.formArea}>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={EmailSchema}
          validateOnChange={false}
          validateOnBlur={true}
        >
          {({ isSubmitting, setFieldValue }) => (
            <Form>
              <Flex
                direction='column'
                gap='l'
                css={{ marginTop: 'var(--harmony-unit-8)' }}
              >
                <Text variant='heading' size='m'>
                  {messages.signUpEmailTitle}
                </Text>
                <Text
                  variant='body'
                  size='m'
                  css={{ color: 'var(--harmony-n-600)' }}
                >
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
              <div className={styles.signUpButtonContainer}>
                <Text variant='body' size='s'>
                  {createEmailPageMessages.haveAccount} {signInLink}
                </Text>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
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
    <Flex direction='column' gap='s'>
      {/* @ts-ignore */}
      <Input
        placeholder='Email'
        size='medium'
        type='email'
        name='email'
        id='email-input'
        isRequired
        autoComplete='username'
        value={field.value}
        onChange={(value: string) => {
          setFieldValue('email', value)
        }}
        onBlur={field.onBlur}
        className={styles.emailInput}
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
