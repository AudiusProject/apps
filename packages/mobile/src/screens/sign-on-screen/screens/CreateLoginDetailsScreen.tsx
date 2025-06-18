import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { createLoginDetailsPageMessages } from '@audius/common/messages'
import { emailSchema, createLoginDetailsSchema } from '@audius/common/schemas'
import { setValueField } from '@audius/web/src/common/store/pages/signon/actions'
import {
  getEmailField,
  getHandleField,
  getIsVerified
} from '@audius/web/src/common/store/pages/signon/selectors'
import { css } from '@emotion/native'
import { useQueryClient } from '@tanstack/react-query'
import { Formik, useField } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync } from 'react-use'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Text, Flex, IconVerified, useTheme } from '@audius/harmony-native'
import { PasswordField } from 'app/components/fields'
import { useNavigation } from 'app/hooks/useNavigation'

import { NewEmailField } from '../components/NewEmailField'
import { PasswordCompletionChecklist } from '../components/PasswordCompletionChecklist'
import { SignUpAgreementText } from '../components/SignUpPolicyText'
import { Heading, Page, PageFooter, ReadOnlyField } from '../components/layout'
import type { SignOnScreenParamList } from '../types'
import { useTrackScreen } from '../utils/useTrackScreen'

export type CreateLoginDetailsValues = {
  email: string
  password: string
  confirmPassword: string
}

// Same email field but with extra logic to check initial value coming from redux store
const EmailField = ({ onChangeScreen }: { onChangeScreen: () => void }) => {
  const [, , { setValue }] = useField('email')
  const existingEmailValue = useSelector(getEmailField)
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()

  // For the email field on this page, design requested that the field only be prepoulated if the email is valid.
  // Since the schema is async we have to do some async shenanigans to set the value after mount.
  useAsync(async () => {
    const schema = emailSchema(queryContext, queryClient)
    try {
      await schema.parseAsync({
        email: existingEmailValue.value
      })
      setValue(existingEmailValue.value)
    } catch (e) {
      // invalid schema means we don't update the initial value
    }
  }, [])
  return (
    <NewEmailField
      name='email'
      label={createLoginDetailsPageMessages.emailLabel}
      onChangeScreen={onChangeScreen}
    />
  )
}

export const CreateLoginDetailsScreen = () => {
  const dispatch = useDispatch()
  const handleField = useSelector(getHandleField)
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const loginDetailsFormikSchema = useMemo(
    () =>
      toFormikValidationSchema(
        createLoginDetailsSchema(queryContext, queryClient)
      ),
    [queryContext, queryClient]
  )

  useTrackScreen('CreateLoginDetails')

  const isVerified = useSelector(getIsVerified)
  const navigation = useNavigation<SignOnScreenParamList>()
  const { spacing } = useTheme()

  const initialValues = {
    email: '',
    password: '',
    confirmPassword: ''
  }

  const handleSubmit = useCallback(
    (values: CreateLoginDetailsValues) => {
      const { email, password } = values
      dispatch(setValueField('email', email))
      dispatch(setValueField('password', password))
      navigation.navigate('FinishProfile')
    },
    [dispatch, navigation]
  )

  const navigateToLogin = () => {
    navigation.navigate('SignOn', { screen: 'sign-in' })
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={loginDetailsFormikSchema}
    >
      {({ isValid, dirty }) => (
        <Page>
          <Heading
            heading={createLoginDetailsPageMessages.title}
            description={createLoginDetailsPageMessages.description}
          />
          <Flex direction='column' h='100%' gap='l'>
            <Flex direction='column' gap='l'>
              <ReadOnlyField
                label={createLoginDetailsPageMessages.handleLabel}
                value={
                  <Flex gap='xs'>
                    <Text variant='body' size='m' color='default'>
                      @{handleField.value}
                      {isVerified ? (
                        <IconVerified
                          style={css({
                            height: spacing.unit3,
                            width: spacing.unit3
                          })}
                        />
                      ) : null}
                    </Text>
                  </Flex>
                }
              />
              <EmailField onChangeScreen={navigateToLogin} />
              <PasswordField
                name='password'
                autoComplete='new-password'
                label={createLoginDetailsPageMessages.passwordLabel}
              />
              <PasswordField
                name='confirmPassword'
                autoComplete='new-password'
                label={createLoginDetailsPageMessages.confirmPasswordLabel}
              />
              <PasswordCompletionChecklist />
            </Flex>
          </Flex>
          <PageFooter
            shadow='flat'
            prefix={<SignUpAgreementText />}
            buttonProps={{
              disabled: !(
                (dirty || (initialValues.email && initialValues.password)) &&
                isValid
              )
            }}
          />
        </Page>
      )}
    </Formik>
  )
}
