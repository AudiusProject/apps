import { IconSearch, Paper, Text } from '@audius/harmony'

import { useMedia } from 'hooks/useMedia'
const messages = {
  cta: 'Search the Catalog',
  description:
    'Apply filters or search to discover tracks, profile, playlists, and albums.'
}

export const SearchCatalogTile = () => {
  const { isMobile } = useMedia()
  return (
    <Paper
      pv={isMobile ? '2xl' : '3xl'}
      ph={isMobile ? 'l' : '3xl'}
      mv='s'
      mh='xl'
      direction='column'
      gap={isMobile ? 's' : 'l'}
      alignItems='center'
      w={isMobile ? 'auto' : '100%'}
    >
      <IconSearch color='default' size={isMobile ? 'l' : '2xl'} />
      <Text
        variant={isMobile ? 'title' : 'heading'}
        size={isMobile ? 'l' : 'm'}
      >
        {messages.cta}
      </Text>
      <Text variant='body' size={isMobile ? 'm' : 'l'}>
        {messages.description}
      </Text>
    </Paper>
  )
}
