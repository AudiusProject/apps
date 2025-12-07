import { useCallback, useRef } from 'react'

import { createPasswordPageMessages as messages } from '@audius/common/messages'
import { passwordSchema } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { setValueField } from 'common/store/pages/signon/actions'
import { getEmailField } from 'common/store/pages/signon/selectors'
import { useMedia } from 'hooks/useMedia'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { EnterPasswordSection } from '../components/EnterPasswordSection'
import { SignUpAgreementText } from '../components/SignUpPolicyText'
import { Heading, Page, PageFooter, ReadOnlyField } from '../components/layout'

const { SIGN_UP_HANDLE_PAGE } = route

const initialValues = {
  password: '',
  confirmPassword: ''
}

type CreatePasswordValues = {
  password: string
  confirmPassword: string
}

const passwordFormikSchema = toFormikValidationSchema(passwordSchema)

export const CreatePasswordPage = () => {
  const dispatch = useDispatch()
  const emailField = useSelector(getEmailField)
  const navigate = useNavigateToPage()
  const { isMobile } = useMedia()
  const passwordInputRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = useCallback(
    (values: CreatePasswordValues) => {
      const { password } = values
      dispatch(setValueField('password', password))
      navigate(SIGN_UP_HANDLE_PAGE)
    },
    [dispatch, navigate]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={passwordFormikSchema}
    >
      {({ isValid, dirty }) => (
        <Page
          as={Form}
          transition={isMobile ? undefined : 'horizontal'}
          autoFocusInputRef={passwordInputRef}
        >
          <Heading
            heading={messages.createYourPassword}
            description={messages.description}
          />
          <Flex direction='column' h='100%' gap='l'>
            <ReadOnlyField
              label={messages.yourEmail}
              value={emailField.value}
            />
            {/* @ts-ignore */}
            <EnterPasswordSection inputRef={passwordInputRef} />
          </Flex>
          <PageFooter
            shadow='flat'
            p={0}
            prefix={<SignUpAgreementText />}
            buttonProps={{ disabled: !(dirty && isValid) }}
          />
        </Page>
      )}
    </Formik>
  )
}
