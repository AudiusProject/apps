import { useCurrentAccount } from '@audius/common/api'
import { signInPageMessages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Helmet } from 'react-helmet'
import { useSelector } from 'react-redux'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useFirstMountState } from 'react-use'

import { getEmailField, getIsGuest } from 'common/store/pages/signon/selectors'

import { ConfirmEmailPage } from './ConfirmEmailPage'
import { SignInPage } from './SignInPage'

const { SIGN_IN_PAGE, SIGN_UP_PASSWORD_PAGE } = route

export const SignInRootPage = () => {
  // Redirect users from confirm-email page on first mount
  const isFirstMount = useFirstMountState()
  const { data: currentAccountEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })
  const { value: emailFromSignOn } = useSelector(getEmailField)
  const isGuest = useSelector(getIsGuest)

  return (
    <>
      <Helmet>
        <title>{signInPageMessages.metaTitle}</title>
        <meta name='description' content={signInPageMessages.metaDescription} />
      </Helmet>
      <Routes>
        <Route path='/' element={<SignInPage />} />
        {isGuest && currentAccountEmail === emailFromSignOn ? (
          <Route
            path='*'
            element={<Navigate to={SIGN_UP_PASSWORD_PAGE} replace />}
          />
        ) : isGuest && currentAccountEmail !== emailFromSignOn ? (
          <Route path='confirm-email' element={<ConfirmEmailPage />} />
        ) : isFirstMount ? (
          <Route path='*' element={<Navigate to={SIGN_IN_PAGE} replace />} />
        ) : (
          <Route path='confirm-email' element={<ConfirmEmailPage />} />
        )}
      </Routes>
    </>
  )
}
