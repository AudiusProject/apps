import { Helmet } from 'react-helmet'

import { getAudiusHostname } from '../../util/getEnv'

const TrackHelmet = ({ track }) => {
  if (!track) {
    return null
  }

  const title = `${track.title} by ${track.user.name} • Audius`
  const description = `Listen to ${track.title} on Audius. ${track.user.name} · Song`
  const hostname = getAudiusHostname()
  const url = `https://${hostname}${track.permalink}`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': url,
    url,
    name: track.title,
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

export default TrackHelmet
