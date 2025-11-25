import { ReactNode, useCallback } from 'react'

import { route } from '@audius/common/utils'
import {
  Box,
  Flex,
  FlexProps,
  IconAudiusLogoHorizontal,
  IconCaretLeft,
  IconCloseAlt,
  PlainButton,
  useTheme
} from '@audius/harmony'
import { Route, Routes, useMatch, useNavigate } from 'react-router-dom'

import { getRouteOnExit } from 'common/store/pages/signon/selectors'
import { useMedia } from 'hooks/useMedia'
import { useSelector } from 'utils/reducer'

import { useDetermineAllowedRoute } from '../utils/useDetermineAllowedRoutes'

import { ProgressHeader } from './ProgressHeader'

const {
  SIGN_IN_PAGE,
  SIGN_UP_ARTISTS_PAGE,
  SIGN_UP_EMAIL_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_HANDLE_PAGE,
  SIGN_UP_PAGE
} = route

const useIsBackAllowed = () => {
  const match = useMatch('/signup/:currentPath')
  const matchSignIn = useMatch('/signin/:currentPath')
  const determineAllowedRoute = useDetermineAllowedRoute()

  if (match?.params?.currentPath) {
    const { allowedRoutes } = determineAllowedRoute(match.params.currentPath)
    const currentRouteIndex = allowedRoutes.indexOf(match.params.currentPath)
    const isBackAllowed = allowedRoutes.length > 1 && currentRouteIndex > 0
    return isBackAllowed
  }

  if (matchSignIn?.params?.currentPath) {
    return true
  }

  return false
}

type HeaderRootProps = FlexProps & {
  children: ReactNode
}

const HeaderRoot = (props: HeaderRootProps) => {
  const { children, ...other } = props
  const isBackAllowed = useIsBackAllowed()
  const { spacing } = useTheme()

  return (
    <Flex
      ph='xl'
      w='100%'
      borderBottom={isBackAllowed ? 'default' : undefined}
      alignItems='center'
      backgroundColor='white'
      css={{
        minHeight: spacing['3xl'],
        zIndex: 1,
        flexShrink: 0,
        position: 'sticky',
        top: 0
      }}
      {...other}
    >
      {children}
    </Flex>
  )
}

export const NavHeader = () => {
  const isBackAllowed = useIsBackAllowed()
  const navigate = useNavigate()
  const { isMobile } = useMedia()
  const { iconSizes } = useTheme()
  const routeOnExit = useSelector(getRouteOnExit)

  const handleClose = useCallback(() => {
    navigate(routeOnExit)
  }, [navigate, routeOnExit])

  const audiusLogo = <IconAudiusLogoHorizontal color='subdued' sizeH='l' />

  return (
    <Routes>
      <Route
        path={SIGN_IN_PAGE}
        element={
          isMobile ? (
            <HeaderRoot pv='l'>
              <PlainButton
                size='large'
                css={{ padding: 0 }}
                onClick={handleClose}
                iconLeft={IconCloseAlt}
                variant='subdued'
              />
            </HeaderRoot>
          ) : null
        }
      />
      <Route
        path={SIGN_UP_PAGE}
        element={
          isMobile ? (
            <HeaderRoot pv='l'>
              <PlainButton
                size='large'
                css={{ padding: 0 }}
                onClick={handleClose}
                iconLeft={IconCloseAlt}
                variant='subdued'
              />
            </HeaderRoot>
          ) : null
        }
      />
      <Route
        path={SIGN_UP_EMAIL_PAGE}
        element={
          isMobile ? (
            <HeaderRoot pv='l'>
              <PlainButton
                size='large'
                css={{ padding: 0 }}
                onClick={handleClose}
                iconLeft={IconCloseAlt}
                variant='subdued'
              />
            </HeaderRoot>
          ) : null
        }
      />
      {!isMobile ? (
        <>
          <Route
            path={SIGN_UP_HANDLE_PAGE}
            element={
              <HeaderRoot justifyContent='center' pt='l'>
                <Box css={{ position: 'absolute', top: 20, left: 24 }}>
                  {audiusLogo}
                </Box>
                <ProgressHeader />
              </HeaderRoot>
            }
          />
          <Route
            path={SIGN_UP_FINISH_PROFILE_PAGE}
            element={
              <HeaderRoot justifyContent='center' pt='l'>
                <Box css={{ position: 'absolute', top: 20, left: 24 }}>
                  {audiusLogo}
                </Box>
                <ProgressHeader />
              </HeaderRoot>
            }
          />
          <Route
            path={SIGN_UP_GENRES_PAGE}
            element={
              <HeaderRoot justifyContent='center' pt='l'>
                <Box css={{ position: 'absolute', top: 20, left: 24 }}>
                  {audiusLogo}
                </Box>
                <ProgressHeader />
              </HeaderRoot>
            }
          />
          <Route
            path={SIGN_UP_ARTISTS_PAGE}
            element={
              <HeaderRoot justifyContent='center' pt='l'>
                <Box css={{ position: 'absolute', top: 20, left: 24 }}>
                  {audiusLogo}
                </Box>
                <ProgressHeader />
              </HeaderRoot>
            }
          />
        </>
      ) : null}
      <Route
        path='*'
        element={
          <HeaderRoot justifyContent='space-between' pv='l'>
            {isBackAllowed ? (
              <>
                <PlainButton
                  size='large'
                  css={{ padding: 0 }}
                  onClick={() => navigate(-1)}
                  iconLeft={IconCaretLeft}
                  variant='subdued'
                />
                {audiusLogo}
                <Box css={{ width: iconSizes.m }} />
              </>
            ) : (
              <Flex w='100%' justifyContent='center'>
                {audiusLogo}
              </Flex>
            )}
          </HeaderRoot>
        }
      />
    </Routes>
  )
}
