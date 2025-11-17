import { route } from '@audius/common/utils'
import { Helmet } from 'react-helmet'
import { useSelector } from 'react-redux'
import { Redirect, Route, RouteProps, Switch } from 'react-router-dom'

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
function SignUpRoute({ children, ...rest }: RouteProps) {
  const determineAllowedRoute = useDetermineAllowedRoute()

  return (
    <Route
      {...rest}
      render={({ location }) => {
        // Check if the route is allowed, if not we redirect accordingly
        const { isAllowedRoute, correctedRoute } = determineAllowedRoute(
          location.pathname
        )

        return isAllowedRoute ? (
          <>{children}</>
        ) : (
          <Redirect to={correctedRoute} />
        )
      }}
    />
  )
}

export const SignUpPage = () => {
  const completionRoute = useSelector(getRouteOnCompletion)

  return (
    <RouteContextProvider>
      <Helmet>
        <title>{messages.metaTitle}</title>
        <meta name='description' content={messages.metaDescription} />
      </Helmet>
      <Switch>
        <SignUpRoute exact path={SIGN_UP_PAGE} />
        <SignUpRoute exact path={SIGN_UP_EMAIL_PAGE}>
          <CreateEmailPage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_PASSWORD_PAGE}>
          <CreatePasswordPage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_HANDLE_PAGE}>
          <PickHandlePage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_REVIEW_HANDLE_PAGE}>
          <ReviewHandlePage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_FINISH_PROFILE_PAGE}>
          <FinishProfilePage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_GENRES_PAGE}>
          <SelectGenresPage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_ARTISTS_PAGE}>
          <SelectArtistsPage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_APP_CTA_PAGE}>
          <MobileAppCtaPage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_LOADING_PAGE}>
          <LoadingAccountPage />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_COMPLETED_REDIRECT}>
          <Redirect to={completionRoute || FEED_PAGE} />
        </SignUpRoute>
        <SignUpRoute exact path={SIGN_UP_REFERRER_COMPLETED_REDIRECT}>
          <Redirect to={TRENDING_PAGE} />
        </SignUpRoute>
        <SignUpRoute path='*' />
      </Switch>
    </RouteContextProvider>
  )
}
