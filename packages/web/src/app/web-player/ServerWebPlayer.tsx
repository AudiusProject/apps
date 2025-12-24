import { ReactElement } from 'react'

import imageProfilePicEmpty from '@audius/common/src/assets/img/imageProfilePicEmpty2X.png'
import '@audius/harmony/dist/harmony.css'
import IconAudiusLogoHorizontal from '@audius/harmony/src/assets/icons/AudiusLogoHorizontal.svg'
import IconExplore from '@audius/harmony/src/assets/icons/Explore.svg'
import IconFeed from '@audius/harmony/src/assets/icons/Feed.svg'
import IconFavorite from '@audius/harmony/src/assets/icons/Heart.svg'
import IconSearch from '@audius/harmony/src/assets/icons/Search.svg'
import IconTrending from '@audius/harmony/src/assets/icons/Trending.svg'
import IconUser from '@audius/harmony/src/assets/icons/User.svg'
import { Avatar } from '@audius/harmony/src/components/avatar'
import { Button } from '@audius/harmony/src/components/button/Button/Button'
import { IconButton } from '@audius/harmony/src/components/button/IconButton/IconButton'
import { Box } from '@audius/harmony/src/components/layout/Box'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Text } from '@audius/harmony/src/components/text'
import { TextLink } from '@audius/harmony/src/components/text-link'
import { ThemeProvider } from '@audius/harmony/src/foundations/theme/ThemeProvider'
import { Link, StaticRouter } from 'react-router'

type WebPlayerContentProps = {
  children: ReactElement
  isMobile: boolean
}

const WebPlayerContent = (props: WebPlayerContentProps) => {
  const { isMobile, children } = props

  if (isMobile) {
    return (
      <Flex direction='column' w='100%' backgroundColor='default'>
        <Flex
          h={40}
          w='100%'
          backgroundColor='white'
          justifyContent='space-between'
          alignItems='center'
          ph='s'
        >
          <Box flex={1}>
            <Button asChild size='xs'>
              <Link to='signup'>Sign Up</Link>
            </Button>
          </Box>
          <Box css={{ flex: 1 }}>
            <Link to='/'>
              <IconAudiusLogoHorizontal color='subdued' sizeH='l' />
            </Link>
          </Box>
          <Flex flex={1} justifyContent='flex-end'>
            <IconButton
              icon={IconSearch}
              aria-label='search'
              color='subdued'
              size='m'
            />
          </Flex>
        </Flex>
        <Box pb={50}>{children}</Box>
        <Box
          as='nav'
          h={50}
          w='100%'
          backgroundColor='surface1'
          css={{ position: 'fixed', bottom: 0, zIndex: 1 }}
        >
          <Flex
            as='ul'
            justifyContent='space-evenly'
            alignItems='center'
            h='100%'
          >
            <Flex as='li' w='100%' justifyContent='center'>
              <Link to='/feed'>
                <IconFeed color='default' height={28} width={28} />
              </Link>
            </Flex>
            <Flex as='li' w='100%' justifyContent='center'>
              <Link to='/trending'>
                <IconTrending color='default' height={28} width={28} />
              </Link>
            </Flex>
            <Flex as='li' w='100%' justifyContent='center'>
              <Link to='/explore'>
                <IconExplore color='default' height={28} width={28} />
              </Link>
            </Flex>
            <Flex as='li' w='100%' justifyContent='center'>
              <Link to='/library'>
                <IconFavorite color='default' height={28} width={28} />
              </Link>
            </Flex>
            <Flex as='li' w='100%' justifyContent='center'>
              <Link to='/profile'>
                <IconUser color='default' height={28} width={28} />
              </Link>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    )
  }

  return (
    <Flex w='100%'>
      <Flex
        as='nav'
        h='100%'
        w={240}
        css={{ minWidth: 240 }}
        backgroundColor='surface1'
        borderRight='default'
        direction='column'
      >
        <Flex
          pl={28}
          h={57}
          alignItems='center'
          backgroundColor='white'
          borderBottom='default'
          w='100%'
        >
          <Link to='/'>
            <IconAudiusLogoHorizontal
              color='subdued'
              css={{ width: 100, height: 24 }}
            />
          </Link>
        </Flex>
        <Flex pt='l' pr='s' pb='s' pl='m'>
          <Flex gap='s'>
            <Avatar
              src={imageProfilePicEmpty}
              h={48}
              w={48}
              isLoading={false}
            />
            <Flex direction='column' gap='xs'>
              <Text size='s' strength='strong'>
                Have an Account?
              </Text>
              <TextLink
                variant='visible'
                size='xs'
                strength='weak'
                href='/signin'
              >
                Sign in
              </TextLink>
            </Flex>
          </Flex>
        </Flex>
        <Flex direction='column' mt={20} ph='2xl' gap='2xl'>
          <Flex direction='column' gap='s'>
            <Text
              variant='label'
              strength='strong'
              size='l'
              color='subdued'
              css={{ fontSize: 18 }}
              tag='h3'
            >
              Discover
            </Text>
            <Flex direction='column' gap='xs'>
              <TextLink variant='subdued' size='s' href='/feed' disabled>
                Feed
              </TextLink>
              <TextLink size='s' href='/trending'>
                Trending
              </TextLink>
              <TextLink size='s' href='/explore'>
                Explore
              </TextLink>
            </Flex>
          </Flex>
          <Flex direction='column' gap='s'>
            <Text
              variant='label'
              strength='strong'
              size='l'
              color='subdued'
              css={{ fontSize: 18 }}
              tag='h3'
            >
              Your Music
            </Text>
            <Flex direction='column' gap='xs'>
              <TextLink size='s' href='/library'>
                Library
              </TextLink>
              <TextLink size='s' href='/history' variant='subdued' disabled>
                History
              </TextLink>
            </Flex>
          </Flex>
          <Flex direction='column' gap='s'>
            <Text
              variant='label'
              strength='strong'
              size='l'
              color='subdued'
              css={{ fontSize: 18 }}
              tag='h3'
            >
              Playlists
            </Text>
            <Flex direction='column' gap='xs'>
              <Text size='s' color='subdued'>
                Create your first playlist!
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
      <Flex w='100%' direction='column' css={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </Flex>
    </Flex>
  )
}

type ServerWebPlayerProps = {
  isMobile: boolean
  location: string
  children: ReactElement
}

export const ServerWebPlayer = (props: ServerWebPlayerProps) => {
  const { isMobile, location, children } = props
  return (
    <StaticRouter location={location}>
      <ThemeProvider theme='day'>
        <WebPlayerContent isMobile={isMobile}>{children}</WebPlayerContent>
      </ThemeProvider>
    </StaticRouter>
  )
}
