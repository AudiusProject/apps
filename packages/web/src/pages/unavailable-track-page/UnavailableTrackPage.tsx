import { route } from '@audius/common/utils'
import { Button, Flex, IconArrowRight, Text } from '@audius/harmony'
import { Link } from 'react-router'

import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './UnavailableTrackPage.module.css'

const { HOME_PAGE } = route

const messages = {
  title: 'Track Unavailable',
  heading: 'This Track Isn’t Available',
  description: 'This track can no longer be streamed on Audius.',
  buttonText: 'Take Me Back To The Music'
}

const UnavailableTrackContent = ({ isMobile }: { isMobile: boolean }) => (
  <Flex
    w='100%'
    column
    alignItems='center'
    justifyContent='center'
    p='xl'
    // On mobile web the page container is stretched to the viewport, so
    // `flex: 1` claims everything below the header. On desktop the page is
    // sized by its content, so fall back to a fixed minimum.
    flex={isMobile ? 1 : undefined}
    css={{
      minHeight: isMobile ? undefined : 'clamp(240px, 32vh, 420px)',
      userSelect: 'none'
    }}
  >
    <Flex column alignItems='center' gap='xl' css={{ maxWidth: 400 }}>
      <Flex column alignItems='center' gap='s'>
        <Text variant='heading' size='m' textAlign='center'>
          {messages.heading}
        </Text>
        <Text variant='body' size='l' color='subdued' textAlign='center'>
          {messages.description}
        </Text>
      </Flex>
      <Button
        variant='primary'
        fullWidth={isMobile}
        asChild
        iconRight={IconArrowRight}
      >
        <Link to={HOME_PAGE}>{messages.buttonText}</Link>
      </Button>
    </Flex>
  </Flex>
)

/**
 * Shown in place of a track page the API reports as non-streamable - today
 * that means the owner is no longer active. Deliberately says nothing about
 * the account, since the same flag covers an artist deactivating their own
 * account and an account being delisted, and emits none of the track's own
 * metadata or artwork. Marked noIndex so it stays out of search results.
 */
export const UnavailableTrackPage = () => {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <MobilePageContainer
        title={messages.title}
        description={messages.description}
        containerClassName={styles.container}
        noIndex
      >
        <UnavailableTrackContent isMobile />
      </MobilePageContainer>
    )
  }

  return (
    <Page title={messages.title} description={messages.description} noIndex>
      <UnavailableTrackContent isMobile={false} />
    </Page>
  )
}

export default UnavailableTrackPage
