import { useCurrentAccountUser } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import {
  getAccountAlreadyExisted,
  getSignOn
} from 'common/store/pages/signon/selectors'
import { EditingStatus } from 'common/store/pages/signon/types'
import { env } from 'services/env'

import { useFastReferral } from '../hooks/useFastReferral'

const { FEED_PAGE, SignUpPath } = route

const isDevEnvironment =
  env.ENVIRONMENT === 'development' ||
  window.localStorage.getItem('FORCE_DEV') === 'true'

const openWelcomeModalAfterRender = (setOpen: (open: boolean) => void) => {
  queueMicrotask(() => {
    setOpen(true)
  })
}

export const useDetermineAllowedRoute = () => {
  const [, setIsWelcomeModalOpen] = useModalState('Welcome')
  const signUpState = useSelector(getSignOn)
  const { data: accountUser } = useCurrentAccountUser({
    select: (user) => ({
      isAccountComplete: !!user?.user_id && !!user?.handle && user?.name,
      followeeCount: user?.followee_count
    })
  })
  const { followeeCount, isAccountComplete } = accountUser ?? {}
  const hasAlreadySignedUp = useSelector(getAccountAlreadyExisted)
  const isFastReferral = useFastReferral()

  const pastAccountPhase = signUpState.finishedPhase1 || isAccountComplete

  return (
    requestedRoute: string | typeof SignUpPath
  ): {
    allowedRoutes: string[]
    isAllowedRoute: boolean
    correctedRoute: string
  } => {
    if (followeeCount && followeeCount >= 3) {
      openWelcomeModalAfterRender(setIsWelcomeModalOpen)
      return {
        allowedRoutes: [],
        isAllowedRoute: false,
        correctedRoute: FEED_PAGE
      }
    }
    const attemptedPath = requestedRoute
      .toString()
      .replace(/^\/?signup\/?/, '')
      .replace(/^\/|\/$/g, '')
    let allowedRoutes: string[] = [SignUpPath.createEmail]

    if (signUpState.linkedSocialOnFirstPage) {
      allowedRoutes.push(SignUpPath.reviewHandle)
      allowedRoutes.push(SignUpPath.finishProfile)
    }

    if (pastAccountPhase) {
      allowedRoutes = [SignUpPath.selectGenres]
      allowedRoutes.push(SignUpPath.loading)

      if (isFastReferral) {
        allowedRoutes.push(SignUpPath.selectArtists)
        allowedRoutes.push(SignUpPath.appCta)
        allowedRoutes.push(SignUpPath.completedRedirect)
        allowedRoutes.push(SignUpPath.completedReferrerRedirect)
      }

      allowedRoutes.push(SignUpPath.selectArtists)

      const hasCompletedSelection =
        (signUpState.genres && signUpState.genres.length > 0) ||
        (signUpState.selectedUserIds &&
          signUpState.selectedUserIds.length > 0) ||
        isDevEnvironment

      const accountCreationStarted =
        signUpState.status === EditingStatus.LOADING ||
        signUpState.status === EditingStatus.SUCCESS

      if (hasCompletedSelection || accountCreationStarted) {
        allowedRoutes.push(SignUpPath.appCta)
        allowedRoutes.push(SignUpPath.completedRedirect)
      }
    } else {
      if (signUpState.email.value) {
        allowedRoutes.push(SignUpPath.createPassword)

        if (
          signUpState.password.value ||
          signUpState.usingExternalWallet ||
          (!signUpState.isGuest && attemptedPath === SignUpPath.createPassword)
        ) {
          if (!signUpState.linkedSocialOnFirstPage) {
            allowedRoutes.push(SignUpPath.pickHandle)
          }

          if (signUpState.handle.value) {
            allowedRoutes.push(SignUpPath.reviewHandle)
            allowedRoutes.push(SignUpPath.finishProfile)
          }
        }
      }
    }

    let isAllowedRoute = allowedRoutes.includes(attemptedPath)
    if (
      pastAccountPhase &&
      attemptedPath === SignUpPath.selectGenres &&
      !isAllowedRoute
    ) {
      isAllowedRoute = true
    }
    let correctedPath =
      attemptedPath === '/signup' && hasAlreadySignedUp
        ? allowedRoutes[allowedRoutes.length - 1]
        : isAllowedRoute
          ? attemptedPath
          : attemptedPath === 'signup' || attemptedPath === ''
            ? allowedRoutes[0]
            : allowedRoutes[allowedRoutes.length - 1]

    if (
      pastAccountPhase &&
      !isAllowedRoute &&
      correctedPath === SignUpPath.selectArtists &&
      !(signUpState.genres && signUpState.genres.length > 0)
    ) {
      correctedPath = SignUpPath.selectGenres
    }

    return {
      allowedRoutes,
      isAllowedRoute,
      correctedRoute: `/signup/${correctedPath}`
    }
  }
}
