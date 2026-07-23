import { route } from '@audius/common/utils'
import { Button, Flex, IconArrowRight, Text } from '@audius/harmony'
import { Link } from 'react-router'

const { HOME_PAGE } = route

const messages = {
  helpText: 'This Account No Longer Exists',
  description: 'The account you’re looking for has been deleted.',
  buttonText: 'Take Me Back To The Music'
}

export const DeactivatedProfileTombstone = ({
  isMobile = false
}: {
  isMobile?: boolean
}) => {
  return (
    <Flex
      w='100%'
      column
      alignItems='center'
      justifyContent='center'
      p='xl'
      // Fill the space below the profile header so the message reads as a
      // centered empty state rather than being pinned to the top. On mobile
      // web the page container is stretched to the viewport, so `flex: 1`
      // claims everything below the header; on desktop the page is sized by
      // its content, so fall back to a fixed minimum.
      flex={isMobile ? 1 : undefined}
      css={{
        minHeight: isMobile ? undefined : 'clamp(240px, 32vh, 420px)',
        userSelect: 'none'
      }}
    >
      <Flex
        column
        alignItems='center'
        gap='xl'
        css={{ width: '100%', maxWidth: 400 }}
      >
        <Flex column alignItems='center' gap='s'>
          <Text variant='heading' size='m' textAlign='center'>
            {messages.helpText}
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
}
