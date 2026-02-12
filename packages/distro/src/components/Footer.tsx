import { Flex, IconAudiusLogoHorizontal, Text, TextLink } from '@audius/harmony'

const messages = {
  privacy: 'Privacy',
  terms: 'Terms',
  developers: 'Developers',
  audius: 'Audius'
}

const links = {
  privacy: 'https://audius.co/legal/privacy-policy',
  terms: 'https://audius.co/legal/terms-of-use',
  developers: 'https://docs.audius.co',
  audius: 'https://audius.co'
}

export const Footer = () => (
  <footer>
    <Flex
      justifyContent='space-between'
      alignItems='center'
      backgroundColor='surface1'
      ph='2xl'
      pv='m'
      wrap='wrap'
      columnGap='2xl'
      rowGap='m'
    >
      <Flex alignItems='center' columnGap='2xl' wrap='wrap'>
        <Flex alignItems='center' gap='s'>
          <Flex>
            <IconAudiusLogoHorizontal sizeH='l' width='auto' color='subdued' />
          </Flex>
          <Text variant='body' size='s' color='subdued'>
            &copy; {new Date().getFullYear()}
          </Text>
        </Flex>
        <TextLink
          variant='subdued'
          textVariant='body'
          size='s'
          href={links.privacy}
        >
          {messages.privacy}
        </TextLink>
        <TextLink
          variant='subdued'
          textVariant='body'
          size='s'
          href={links.terms}
        >
          {messages.terms}
        </TextLink>
      </Flex>
      <Flex alignItems='center' gap='2xl'>
        <TextLink
          variant='subdued'
          textVariant='body'
          size='s'
          href={links.developers}
        >
          {messages.developers}
        </TextLink>
        <TextLink
          variant='subdued'
          textVariant='body'
          size='s'
          href={links.audius}
        >
          {messages.audius}
        </TextLink>
      </Flex>
    </Flex>
  </footer>
)
