import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { FEED_PAGE } from '@audius/common/src/utils/route'
import { route } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconCloseAlt,
  Paper,
  Text,
  TextLink,
  useTheme
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import {
  Link,
  Redirect,
  Route,
  Switch,
  useRouteMatch,
  useHistory
} from 'react-router-dom'
import { useSearchParams } from 'react-router-dom-v5-compat'
import { useEffectOnce, useLocalStorage, useMeasure } from 'react-use'

import djBackground from 'assets/img/2-DJ-4-3.jpg'
import djPortrait from 'assets/img/DJportrait.jpg'
import imagePhone from 'assets/img/imagePhone.png'
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
import { AudiusValues } from 'pages/sign-on-page/AudiusValues'
import SignUpPage from 'pages/sign-up-page'
import { NavHeader } from 'pages/sign-up-page/components/NavHeader'
import { ScrollView } from 'pages/sign-up-page/components/layout'

const {
  SIGN_IN_CONFIRM_EMAIL_PAGE,
  SIGN_IN_PAGE,
  SIGN_UP_APP_CTA_PAGE,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_LOADING_PAGE,
  SIGN_UP_PAGE,
  SIGN_UP_PASSWORD_PAGE,
  SIGN_UP_REVIEW_HANDLE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_ARTISTS_PAGE
} = route

const messages = {
  newToAudius: 'New to Audius?',
  createAccount: 'Create an Account'
}

type RootProps = {
  children: ReactNode
}

const DesktopSignOnRoot = (props: RootProps) => {
  const { children } = props
  const { spacing, motion, color } = useTheme()

  const routeOnExit = useSelector(getRouteOnExit)

  const hideCloseButton = useRouteMatch({
    path: [
      SIGN_UP_GENRES_PAGE,
      SIGN_UP_ARTISTS_PAGE,
      SIGN_UP_APP_CTA_PAGE,
      SIGN_UP_LOADING_PAGE
    ],
    exact: true
  })

  const collapsedDesktopPageMatch = useRouteMatch({
    path: [
      SIGN_IN_PAGE,
      SIGN_IN_CONFIRM_EMAIL_PAGE,
      SIGN_UP_PAGE,
      SIGN_UP_EMAIL_PAGE,
      SIGN_UP_PASSWORD_PAGE,
      SIGN_UP_REVIEW_HANDLE_PAGE,
      SIGN_UP_APP_CTA_PAGE
    ],
    exact: true
  })

  const isExpanded = !collapsedDesktopPageMatch

  return (
    <Flex
      w='100%'
      p='unit14'
      justifyContent='center'
      css={{
        background: `radial-gradient(circle at top left, #B749D6 50%, ${color.secondary.s500} 100%)`
      }}
    >
      {!hideCloseButton ? (
        <Link
          to={routeOnExit}
          css={{
            zIndex: 1,
            position: 'absolute',
            left: spacing.xl,
            top: spacing.xl
          }}
        >
          <IconCloseAlt color='white' />
        </Link>
      ) : null}
      <Paper
        w='100%'
        css={{
          flex: 1,
          maxWidth: 1440,
          minWidth: 744,
          overflow: 'hidden'
        }}
      >
        <ScrollView
          direction='column'
          h='100%'
          w={isExpanded ? '100%' : 584}
          flex={isExpanded ? undefined : '1 0 0'}
          css={{
            maxWidth: isExpanded ? '100%' : 584,
            minWidth: 400,
            background: 'white',
            zIndex: 1,
            transition: `width ${motion.expressive}`
          }}
        >
          {children}
        </ScrollView>
        <Flex
          alignItems='center'
          justifyContent='center'
          flex='1 0 0'
          css={{
            zIndex: 0,
            overflow: 'hidden',
            backgroundImage: `radial-gradient(77.16% 77.16% at 50% 51.81%, rgba(91, 35, 225, 0.80) 0%, rgba(113, 41, 230, 0.64) 67.96%, rgba(162, 47, 235, 0.50) 100%), url(${djBackground})`,
            backgroundColor: 'lightgray',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <Switch>
            <Route exact path={SIGN_UP_APP_CTA_PAGE}>
              {/* @ts-ignore box type incorrect */}
              <Box as='img' w='100%' src={imagePhone} />
            </Route>
            <Route path={[SIGN_IN_PAGE, SIGN_UP_PAGE]}>
              {isExpanded ? null : <AudiusValues />}
            </Route>
          </Switch>
        </Flex>
      </Paper>
    </Flex>
  )
}

type MobileSignOnRootProps = RootProps & {
  isLoaded?: boolean
}

type PanelState = 'collapsed' | 'expanding' | 'expanded' | 'collapsing'

const MobileSignOnRoot = (props: MobileSignOnRootProps) => {
  const { children, isLoaded } = props
  const [panelState, setPanelState] = useState<PanelState>('collapsed')
  const { motion } = useTheme()
  const [ref, { height: panelHeight }] = useMeasure<HTMLDivElement>()
  const collapsedPanelHeight = useRef(panelHeight)

  const collapsedMobilePageMatch = useRouteMatch({
    path: [SIGN_IN_PAGE, SIGN_UP_PAGE, SIGN_UP_EMAIL_PAGE],
    exact: true
  })

  const shouldPageExpand = !collapsedMobilePageMatch

  useLayoutEffect(() => {
    if (panelState === 'collapsed') {
      collapsedPanelHeight.current = panelHeight
    }
  }, [panelState, panelHeight])

  // TODO: use `onTransitionEnd`
  useEffect(() => {
    if (shouldPageExpand) {
      setPanelState('expanding')
      const timeout = setTimeout(() => {
        setPanelState('expanded')
      }, 100)
      return () => clearTimeout(timeout)
    } else if (!shouldPageExpand && panelState === 'expanded') {
      setPanelState('collapsing')
      const timeout = setTimeout(() => {
        setPanelState('collapsed')
      }, 500)
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPageExpand])

  const panelHeightMap = {
    collapsed: 'auto',
    expanding: panelHeight,
    expanded: '100%',
    collapsing: collapsedPanelHeight.current
  }

  return (
    <Flex direction='column' w='100%'>
      <Flex
        ref={ref}
        direction='column'
        borderBottomLeftRadius={panelState === 'expanded' ? undefined : '2xl'}
        borderBottomRightRadius={panelState === 'expanded' ? undefined : '2xl'}
        h={panelHeightMap[panelState]}
        css={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          backgroundColor: 'white',
          zIndex: 1,
          transition: `height ${motion.calm}, border-radius ${motion.calm}, transform ${motion.calm} 0.5s`,
          transform: isLoaded ? 'translateY(0px)' : 'translateY(-100%)'
        }}
      >
        {children}
      </Flex>
      <Flex
        direction='column'
        alignItems='center'
        pb='2xl'
        css={{
          paddingTop: collapsedPanelHeight.current,
          flexGrow: 1,
          backgroundImage: `radial-gradient(77.16% 77.16% at 50% 51.81%, rgba(91, 35, 225, 0.80) 0%, rgba(113, 41, 230, 0.64) 67.96%, rgba(162, 47, 235, 0.50) 100%), url(${djPortrait})`,
          backgroundColor: 'lightgray',
          backgroundSize: 'cover',
          backgroundPosition: 'bottom'
        }}
      >
        <Switch>
          <Route path={SIGN_UP_PAGE}>
            <AudiusValues
              css={{
                margin: 'auto',
                opacity: isLoaded ? 1 : 0,
                transition: `opacity ${motion.expressive} 1s`
              }}
            />
          </Route>
          <Route path={SIGN_IN_PAGE}>
            <Text
              variant='title'
              strength='weak'
              color='white'
              css={{
                marginTop: 'auto',
                opacity: isLoaded ? 1 : 0,
                transition: `opacity ${motion.expressive} 1s`
              }}
            >
              {messages.newToAudius}{' '}
              <TextLink variant='inverted' showUnderline asChild>
                <Link to={SIGN_UP_PAGE}>{messages.createAccount}</Link>
              </TextLink>
            </Text>
          </Route>
        </Switch>
      </Flex>
    </Flex>
  )
}

export const SignOnPage = () => {
  const { isMobile } = useMedia()
  const signOnStatus = useSelector(getStatus)
  const routeOnExit = useSelector(getRouteOnExit)
  const dispatch = useDispatch()
  const history = useHistory()
  const [searchParams] = useSearchParams()
  const [guestEmailLocalStorage] = useLocalStorage('guestEmail', '')

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && routeOnExit) {
        history.push(routeOnExit)
      }
    }

    window.addEventListener('keydown', handleEscKey)
    return () => {
      window.removeEventListener('keydown', handleEscKey)
    }
  }, [history, routeOnExit])

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

  const [isLoaded, setIsLoaded] = useState(false)
  const SignOnRoot = isMobile ? MobileSignOnRoot : DesktopSignOnRoot

  useEffectOnce(() => {
    setIsLoaded(true)
  })

  if (signOnStatus === EditingStatus.SUCCESS) {
    return <Redirect to={completionRoute || FEED_PAGE} />
  }

  return (
    <SignOnRoot isLoaded={isLoaded}>
      <NavHeader />
      <Switch>
        <Route path={SIGN_IN_PAGE}>
          <SignInPage />
        </Route>
        <Route path={SIGN_UP_PAGE}>
          <SignUpPage />
        </Route>
      </Switch>
    </SignOnRoot>
  )
}
