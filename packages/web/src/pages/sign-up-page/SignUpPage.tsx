import { ReactNode } from 'react'

import { route } from '@audius/common/utils'
import { Helmet } from 'react-helmet'
import { useSelector } from 'react-redux'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { getRouteOnCompletion } from 'common/store/pages/signon/selectors'
import { useDetermineAllowedRoute } from 'pages/sign-up-page/utils/useDetermineAllowedRoutes'

import { CreateEmailPage } from './pages/CreateEmailPage'
import { CreatePasswordPage } from './pages/CreatePasswordPage'
import { FinishProfilePage } from './pages/FinishProfilePage'
import { LoadingAccountPage } from './pages/LoadingAccountPage'
import { MobileAppCtaPage } from './pages/MobileAppCtaPage'
import { PickHandlePage } from './pages/PickHandlePage'
import { ReviewHandlePage } from './pages/ReviewHandlePage'
import { SelectArtistsPage } from './pages/SelectArtistsPage'
import { SelectGenresPage } from './pages/SelectGenresPage'
import { RouteContextProvider } from './utils/RouteContext'

const {
  FEED_PAGE,
  TRENDING_PAGE,
  SIGN_UP_APP_CTA_PAGE,
  SIGN_UP_ARTISTS_PAGE,
  SIGN_UP_COMPLETED_REDIRECT,
  SIGN_UP_COMPLETED_REFERRER_REDIRECT: SIGN_UP_REFERRER_COMPLETED_REDIRECT,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_LOADING_PAGE,
  SIGN_UP_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE
} = route

const messages = {
  metaTitle: 'Sign Up • Audius',
  metaDescription: 'Create an account on Audius'
}

/**
 * <Route> wrapper that handles redirecting through the sign up page flow
 */
function SignUpRoute({
  children,
  path
}: {
  children?: ReactNode
  path: string
}) {
  const location = useLocation()
  const determineAllowedRoute = useDetermineAllowedRoute()

  // Check if the route is allowed, if not we redirect accordingly
  // useDetermineAllowedRoute expects the full pathname, not a trimmed one
  const { isAllowedRoute, correctedRoute } = determineAllowedRoute(
    location.pathname
  )

  if (!isAllowedRoute) {
    return <Navigate to={correctedRoute} replace />
  }

  return <>{children}</>
}

export const SignUpPage = () => {
  const completionRoute = useSelector(getRouteOnCompletion)

  return (
    <RouteContextProvider>
      <Helmet>
        <title>{messages.metaTitle}</title>
        <meta name='description' content={messages.metaDescription} />
      </Helmet>
      <Routes>
        <Route
          path='/'
          element={
            <SignUpRoute path={SIGN_UP_PAGE}>
              <Navigate to={SIGN_UP_EMAIL_PAGE} replace />
            </SignUpRoute>
          }
        />
        <Route
          path='create-email'
          element={
            // <SignUpRoute path={SIGN_UP_EMAIL_PAGE}>
            <CreateEmailPage />
            // </SignUpRoute>
          }
        />
        <Route
          path='create-password'
          element={
            <SignUpRoute path={SIGN_UP_PASSWORD_PAGE}>
              <CreatePasswordPage />
            </SignUpRoute>
          }
        />
        <Route
          path='pick-handle'
          element={
            <SignUpRoute path={SIGN_UP_HANDLE_PAGE}>
              <PickHandlePage />
            </SignUpRoute>
          }
        />
        <Route
          path='review-handle'
          element={
            <SignUpRoute path={SIGN_UP_REVIEW_HANDLE_PAGE}>
              <ReviewHandlePage />
            </SignUpRoute>
          }
        />
        <Route
          path='finish-profile'
          element={
            <SignUpRoute path={SIGN_UP_FINISH_PROFILE_PAGE}>
              <FinishProfilePage />
            </SignUpRoute>
          }
        />
        <Route
          path='select-genres'
          element={
            <SignUpRoute path={SIGN_UP_GENRES_PAGE}>
              <SelectGenresPage />
            </SignUpRoute>
          }
        />
        <Route
          path='select-artists'
          element={
            <SignUpRoute path={SIGN_UP_ARTISTS_PAGE}>
              <SelectArtistsPage />
            </SignUpRoute>
          }
        />
        <Route
          path='app-cta'
          element={
            <SignUpRoute path={SIGN_UP_APP_CTA_PAGE}>
              <MobileAppCtaPage />
            </SignUpRoute>
          }
        />
        <Route
          path='loading'
          element={
            <SignUpRoute path={SIGN_UP_LOADING_PAGE}>
              <LoadingAccountPage />
            </SignUpRoute>
          }
        />
        <Route
          path='completed'
          element={
            <SignUpRoute path={SIGN_UP_COMPLETED_REDIRECT}>
              <Navigate to={completionRoute || FEED_PAGE} replace />
            </SignUpRoute>
          }
        />
        <Route
          path='completed-referrer'
          element={
            <SignUpRoute path={SIGN_UP_REFERRER_COMPLETED_REDIRECT}>
              <Navigate to={TRENDING_PAGE} replace />
            </SignUpRoute>
          }
        />
        <Route
          path='*'
          element={
            <SignUpRoute path='*'>
              <Navigate to={SIGN_UP_EMAIL_PAGE} replace />
            </SignUpRoute>
          }
        />
      </Routes>
    </RouteContextProvider>
  )
}
