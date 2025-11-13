import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { createEmailPageMessages } from '@audius/common/messages'
import { emailSchema } from '@audius/common/schemas'
import { useQueryClient } from '@tanstack/react-query'
import { setValueField, startSignUp } from 'common/store/pages/signon/actions'
import { getEmailField } from 'common/store/pages/signon/selectors'
import { Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  Button,
  Flex,
  IconArrowRight,
  Text,
  TextLink
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { identify } from 'app/services/analytics'

import { NewEmailField } from '../components/NewEmailField'
import { Heading } from '../components/layout'
import type { SignOnScreenParamList } from '../types'
import { useTrackScreen } from '../utils/useTrackScreen'

import type { SignOnScreenProps } from './types'

type SignUpEmailValues = {
  email: string
}

export const CreateEmailScreen = (props: SignOnScreenProps) => {
  const { onChangeScreen } = props
  const dispatch = useDispatch()
  const navigation = useNavigation<SignOnScreenParamList>()
  const existingEmailValue = useSelector(getEmailField)
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()

  const initialValues = {
    email: existingEmailValue.value ?? ''
  }
  const EmailSchema = useMemo(() => {
    return toFormikValidationSchema(emailSchema(queryContext, queryClient))
  }, [queryContext, queryClient])

  useTrackScreen('CreateEmail')

  const handleSubmit = useCallback(
    (values: SignUpEmailValues) => {
      const { email } = values
      dispatch(setValueField('email', email))
      dispatch(startSignUp())
      identify({ email })
      navigation.navigate('CreatePassword')
    },
    [dispatch, navigation]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={EmailSchema}
      validateOnChange={false}
      validateOnMount={!!existingEmailValue}
      enableReinitialize
    >
      {({ handleSubmit }) => (
        <>
          <Flex style={{ zIndex: 1 }} gap='l'>
            <Heading heading={createEmailPageMessages.title} centered />
            <Flex direction='column' gap='l'>
              <NewEmailField
                name='email'
                label={createEmailPageMessages.emailLabel}
                onChangeScreen={onChangeScreen}
              />
            </Flex>
            <Flex direction='column' gap='l'>
              <Button
                onPress={() => handleSubmit()}
                fullWidth
                iconRight={IconArrowRight}
              >
                {createEmailPageMessages.signUp}
              </Button>
              <Text variant='body' size='m' textAlign='center'>
                {createEmailPageMessages.haveAccount}{' '}
                <TextLink
                  variant='visible'
                  onPress={() => onChangeScreen('sign-in')}
                >
                  {createEmailPageMessages.signIn}
                </TextLink>
              </Text>
            </Flex>
          </Flex>
        </>
      )}
    </Formik>
  )
}
