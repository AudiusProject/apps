import { Helmet } from 'react-helmet'

import { getAudiusHostname } from '../../util/getEnv'

const CollectionHelmet = ({ collection }) => {
  if (!collection) {
    return null
  }

  const title = `${collection.playlistName} by ${collection.user.name} • Audius`
  const description = `Listen on Audius: ${collection.playlistName}`
  const hostname = getAudiusHostname()
  const url = `https://${hostname}${collection.permalink}`
  const isAlbum = collection.isAlbum
  const type = isAlbum ? 'MusicAlbum' : 'MusicPlaylist'
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': url,
    url,
    name: collection.playlistName,
    description
  }

  return (
    <Helmet encodeSpecialCharacters={false}>
      <title>{title}</title>
      <meta name='description' content={description} />
      <link rel='canonical' href={url} />
      <script type='application/ld+json'>
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  )
}

export default CollectionHelmet
