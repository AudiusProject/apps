import { useContext, useState } from 'react'

import { AudiusQueryContext, signUpFetch } from '@audius/common'
import { Button, ButtonType, IconMetamask } from '@audius/harmony'
import { useFormikContext } from 'formik'
import { useDispatch } from 'react-redux'

import { setValueField } from 'common/store/pages/signon/actions'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import ConnectedMetaMaskModal from 'pages/sign-up-page/components/ConnectedMetaMaskModal'
import { SIGN_IN_PAGE, SIGN_UP_HANDLE_PAGE } from 'utils/route'

import { SignUpEmailValues } from './CreateEmailPage'

const messages = {
  signUpMetamask: 'Sign Up With MetaMask',
  unknownError: 'Unknown error occurred.'
}
export const SignUpWithMetaMaskButton = () => {
  const queryContext = useContext(AudiusQueryContext)
  const dispatch = useDispatch()
  const [isMetaMaskModalOpen, setIsMetaMaskModalOpen] = useState(false)
  const { setErrors, validateForm, values } =
    useFormikContext<SignUpEmailValues>()
  const navigate = useNavigateToPage()
  const handleSuccess = () => {
    navigate(SIGN_UP_HANDLE_PAGE)
  }
  const handleClick = async () => {
    const errors = await validateForm(values)
    if (errors.email) {
      return false
    }

    const { email } = values
    if (queryContext !== null) {
      try {
        // Check identity API for existing emails
        const emailExists = await signUpFetch.isEmailInUse(
          { email },
          queryContext
        )
        // Set the email in the store
        dispatch(setValueField('email', values.email))
        if (emailExists) {
          // Redirect to sign in if the email exists already
          navigate(SIGN_IN_PAGE)
        } else {
          setIsMetaMaskModalOpen(true)
        }
      } catch (e) {
        setErrors({ email: messages.unknownError })
      }
    }
  }

  return (
    <>
      <Button
        variant={ButtonType.SECONDARY}
        iconRight={IconMetamask}
        isStaticIcon
        onClick={handleClick}
      >
        {messages.signUpMetamask}
      </Button>
      <ConnectedMetaMaskModal
        open={isMetaMaskModalOpen}
        onBack={() => setIsMetaMaskModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}
