import { accountSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import {
  getAccountAlreadyExisted,
  getSignOn
} from 'common/store/pages/signon/selectors'
import { EditingStatus } from 'common/store/pages/signon/types'
import { env } from 'services/env'
import { FEED_PAGE, SignUpPath } from 'utils/route'

const { getAccountUser } = accountSelectors

const isDevEnvironment =
  env.ENVIRONMENT === 'development' ||
  window.localStorage.getItem('FORCE_DEV') === 'true'

/**
 * Checks against existing sign up redux state,
 * then determines if the requested path should be allowed or not
 * if not allowed, also returns furthest step possible based on existing state
 */
export const useDetermineAllowedRoute = () => {
  const [, setIsWelcomeModalOpen] = useModalState('Welcome')
  const signUpState = useSelector(getSignOn)
  const user = useSelector(getAccountUser)
  const hasAccount = !!user
  const hasAlreadySignedUp = useSelector(getAccountAlreadyExisted)

  const pastAccountPhase = signUpState.finishedPhase1 || hasAccount

  // this requestedRoute string should have already trimmed out /signup/
  return (
    requestedRoute: string | SignUpPath
  ): {
    allowedRoutes: string[]
    isAllowedRoute: boolean
    correctedRoute: string
  } => {
    if (user?.followee_count && user?.followee_count >= 3) {
      setIsWelcomeModalOpen(true)
      return {
        allowedRoutes: [],
        isAllowedRoute: false,
        correctedRoute: FEED_PAGE
      }
    }
    const attemptedPath = requestedRoute.replace('/signup/', '')
    // Have to type as string[] to avoid too narrow of a type for comparing against
    let allowedRoutes: string[] = [SignUpPath.createEmail] // create email is available by default
    if (signUpState.linkedSocialOnFirstPage) {
      allowedRoutes.push(SignUpPath.createLoginDetails)
      allowedRoutes.push(SignUpPath.reviewHandle)
    }
    if (pastAccountPhase) {
      // At this point their identity account is either fully created or being created in the background
      // Either way the user can't go back any more
      allowedRoutes = [SignUpPath.selectGenres]

      // TODO: These checks below here may need to fall under a different route umbrella separate from sign up
      if (signUpState.genres && signUpState.genres.length > 0) {
        // Already have genres selected
        allowedRoutes.push(SignUpPath.selectArtists)

        if (
          signUpState.followArtists?.selectedUserIds?.length >= 3 ||
          isDevEnvironment
        ) {
          // Already have 3 artists followed, ready to finish sign up
          allowedRoutes.push(SignUpPath.appCta)

          if (signUpState.status === EditingStatus.SUCCESS || hasAccount) {
            allowedRoutes.push(SignUpPath.completedRedirect)
          } else {
            allowedRoutes.push(SignUpPath.loading)
          }
        }
      }
    } else {
      // Still before the "has account" phase
      if (signUpState.email.value) {
        // Already have email
        allowedRoutes.push(SignUpPath.createPassword)

        if (signUpState.password.value || signUpState.useMetaMask || signUpState.useWeb3Auth) {
          // Already have password
          if (!signUpState.linkedSocialOnFirstPage) {
            allowedRoutes.push(SignUpPath.pickHandle)
          }

          if (signUpState.handle.value) {
            // Already have handle or it needs review
            allowedRoutes.push(SignUpPath.reviewHandle)
            allowedRoutes.push(SignUpPath.finishProfile)
          }
        }
      }
    }

    const isAllowedRoute = allowedRoutes.includes(attemptedPath)
    // If requested route is allowed return that, otherwise return the last step in the route stack
    const correctedPath =
      attemptedPath === '/signup' && hasAlreadySignedUp
        ? allowedRoutes[allowedRoutes.length - 1]
        : isAllowedRoute
          ? attemptedPath
          : // IF we attempted to go to /signup directly, that means it was a link from somewhere else in the app, so we should start back at the beginning
          attemptedPath === '/signup'
            ? allowedRoutes[0]
            : allowedRoutes[allowedRoutes.length - 1]

    if (correctedPath === SignUpPath.completedRedirect) {
      setIsWelcomeModalOpen(true)
    }

    return {
      allowedRoutes,
      isAllowedRoute,
      correctedRoute: `/signup/${correctedPath}`
    }
  }
}
