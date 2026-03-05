import { ReactNode, useEffect } from 'react'

import { SystemAppearance } from '@audius/common/models'
import { FEED_PAGE } from '@audius/common/src/utils/route'
import { themeSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconAudiusLogoHorizontal,
  IconCloseAlt,
  Paper,
  ThemeProvider as HarmonyThemeProvider,
  useTheme
} from '@audius/harmony'
import type { Theme } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  matchPath,
  useSearchParams
} from 'react-router'
import { useEffectOnce, useLocalStorage } from 'react-use'

import {
  fetchReferrer,
  setField,
  setValueField,
  updateRouteOnCompletion
} from 'common/store/pages/signon/actions'
import {
  getRouteOnCompletion,
  getRouteOnExit,
  getStatus
} from 'common/store/pages/signon/selectors'
import { EditingStatus } from 'common/store/pages/signon/types'
import { useMedia } from 'hooks/useMedia'
import { SignInPage } from 'pages/sign-in-page'
import SignUpPage from 'pages/sign-up-page'
import { NavHeader } from 'pages/sign-up-page/components/NavHeader'
import landingImg from 'public-site/pages/landing-2026/assets/landing.png'

const {
  SIGN_IN_CONFIRM_EMAIL_PAGE,
  SIGN_IN_PAGE,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_LOADING_PAGE,
  SIGN_UP_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE
} = route

type RootProps = {
  children: ReactNode
}

const DesktopSignOnRoot = (props: RootProps) => {
  const { children } = props
  const { spacing } = useTheme()

  const routeOnExit = useSelector(getRouteOnExit)
  const location = useLocation()

  const hideCloseButton = [SIGN_UP_LOADING_PAGE].some((path) => {
    const match = matchPath(path, location.pathname)
    return match && match.pathname === location.pathname
  })

  const isCompactCard = [
    SIGN_IN_PAGE,
    SIGN_IN_CONFIRM_EMAIL_PAGE,
    SIGN_UP_PAGE,
    SIGN_UP_EMAIL_PAGE,
    SIGN_UP_PASSWORD_PAGE,
    SIGN_UP_REVIEW_HANDLE_PAGE
  ].some((path) => {
    const match = matchPath(path, location.pathname)
    return match && match.pathname === location.pathname
  })

  return (
    <Flex
      w='100%'
      css={{
        position: 'relative',
        minHeight: '100vh'
      }}
    >
      {/* Background image + dark overlay */}
      <Box
        css={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${landingImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(100%)'
        }}
      />
      <Box
        css={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }}
      />

      {/* Nav overlay: X close (left) + Audius logo (right) */}
      {!hideCloseButton ? (
        <Flex
          css={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: spacing.xl,
            zIndex: 2
          }}
          justifyContent='space-between'
          alignItems='center'
        >
          <Link
            to={routeOnExit}
            css={{ display: 'flex', alignItems: 'center' }}
          >
            <IconCloseAlt color='white' height={32} width={32} />
          </Link>
          <IconAudiusLogoHorizontal color='white' height={32} width={157} />
        </Flex>
      ) : null}

      {/* Centered card */}
      <Flex
        w='100%'
        justifyContent='center'
        alignItems='center'
        p='2xl'
        css={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          paddingTop: 80
        }}
      >
        <Paper
          borderRadius='l'
          border='strong'
          direction='column'
          css={{
            maxWidth: isCompactCard ? 560 : 760,
            width: '100%',
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '::-webkit-scrollbar': { display: 'none' }
          }}
        >
          {children}
        </Paper>
      </Flex>
    </Flex>
  )
}

type MobileSignOnRootProps = RootProps

const MobileSignOnRoot = (props: MobileSignOnRootProps) => {
  const { children } = props

  return (
    <Flex
      direction='column'
      w='100%'
      css={{
        position: 'relative',
        minHeight: '100dvh',
        backgroundColor: 'var(--harmony-bg-surface-1)',
        paddingTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      <Flex
        direction='column'
        w='100%'
        flex={1}
        justifyContent='flex-start'
        alignItems='stretch'
        css={{
          overflow: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0,
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        <Flex direction='column' w='100%' css={{ flexShrink: 0 }}>
          {children}
        </Flex>
      </Flex>
    </Flex>
  )
}

const { getSystemAppearance } = themeSelectors

export const SignOnPage = () => {
  const { isMobile } = useMedia()
  const signOnStatus = useSelector(getStatus)
  const routeOnExit = useSelector(getRouteOnExit)
  const systemAppearance = useSelector(getSystemAppearance)
  const signOnTheme: Theme =
    systemAppearance === SystemAppearance.DARK
      ? 'default-dark'
      : 'default-light'
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [guestEmailLocalStorage] = useLocalStorage('guestEmail', '')

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && routeOnExit) {
        navigate(routeOnExit)
      }
    }

    window.addEventListener('keydown', handleEscKey)
    return () => {
      window.removeEventListener('keydown', handleEscKey)
    }
  }, [navigate, routeOnExit])

  const rf = searchParams.get('rf')
  const ref = searchParams.get('ref')
  const routeOnCompletion = searchParams.get('routeOnCompletion')
  const guestEmailParam = searchParams.get('guestEmail')
  const guestEmail = guestEmailLocalStorage || guestEmailParam
  const completionRoute = useSelector(getRouteOnCompletion)

  useEffect(() => {
    if (rf) {
      dispatch(fetchReferrer(rf))
    } else if (ref) {
      dispatch(fetchReferrer(ref))
    }

    if (routeOnCompletion) {
      dispatch(updateRouteOnCompletion(routeOnCompletion))
    }

    if (guestEmail) {
      dispatch(setValueField('email', guestEmail))
      dispatch(setField('isGuest', true))
    }
  }, [dispatch, rf, ref, routeOnCompletion, guestEmail])

  useEffectOnce(() => {
    // Check for referrals and set them in the store
    const rf = searchParams.get('rf')
    const ref = searchParams.get('ref')
    if (rf) {
      dispatch(fetchReferrer(rf))
    } else if (ref) {
      dispatch(fetchReferrer(ref))
    }

    // Handle completionOnExit parameter
    const routeOnCompletion = searchParams.get('routeOnCompletion')
    if (routeOnCompletion) {
      dispatch(updateRouteOnCompletion(routeOnCompletion))
    }

    const guestEmailParam = searchParams.get('guestEmail')
    const guestEmail = guestEmailLocalStorage || guestEmailParam
    if (guestEmail) {
      dispatch(setValueField('email', guestEmail))
      dispatch(setField('isGuest', true))
    }
  })

  const SignOnRoot = isMobile ? MobileSignOnRoot : DesktopSignOnRoot
  const location = useLocation()
  const isSignUp = location.pathname.startsWith(SIGN_UP_PAGE)

  if (signOnStatus === EditingStatus.SUCCESS) {
    return <Navigate to={completionRoute || FEED_PAGE} />
  }

  return (
    <HarmonyThemeProvider theme={signOnTheme}>
      <SignOnRoot>
        <NavHeader />
        {isSignUp ? <SignUpPage /> : <SignInPage />}
      </SignOnRoot>
    </HarmonyThemeProvider>
  )
}
