import { ID } from '@audius/common/src/models/Identifiers'
import { getTrack } from '@audius/common/src/store/cache/tracks/selectors'
import { getUser } from '@audius/common/src/store/cache/users/selectors'
import { formatCount } from '@audius/common/src/utils/formatUtil'
import {
  formatDate,
  formatSecondsAsText
} from '@audius/common/src/utils/timeUtil'
import IconHeart from '@audius/harmony/src/assets/icons/Heart.svg'
import IconKebabHorizontal from '@audius/harmony/src/assets/icons/KebabHorizontal.svg'
import IconPlay from '@audius/harmony/src/assets/icons/Play.svg'
import IconRepost from '@audius/harmony/src/assets/icons/Repost.svg'
import IconShare from '@audius/harmony/src/assets/icons/Share.svg'
import { Button } from '@audius/harmony/src/components/button/Button/Button'
import { IconButton } from '@audius/harmony/src/components/button/IconButton/IconButton'
import { PlainButton } from '@audius/harmony/src/components/button/PlainButton/PlainButton'
import { IconComponent } from '@audius/harmony/src/components/icon'
import { Box } from '@audius/harmony/src/components/layout/Box'
import { Divider } from '@audius/harmony/src/components/layout/Divider'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Paper } from '@audius/harmony/src/components/layout/Paper'
import { Tag } from '@audius/harmony/src/components/tag'
import { Text } from '@audius/harmony/src/components/text'
import { TextLink } from '@audius/harmony/src/components/text-link'
import { Link } from 'react-router-dom'

import { ServerUserGeneratedText } from 'components/user-generated-text/ServerUserGeneratedTextV2'
import { useSelector } from 'utils/reducer'
import { profilePage, searchResultsPage } from 'utils/route'

import { Metadata } from './components/Metadata'

type ServerTrackPageProps = {
  trackId: ID
}

const mockCoverArt =
  'https://creatornode12.staging.audius.co/content/QmQGsdkvmuVMnuY3tFQbdHsn7fdRKEUzhWoFdbaifLAEeZ/2000x.jpg'

const mockTrackArt =
  'https://creatornode7.staging.audius.co/content/01HSKF16WN48CA4ZR0BF9HVTMV/1000x1000.jpg'

export const ServerTrackPage = (props: ServerTrackPageProps) => {
  const { trackId } = props
  const track = useSelector((state) => getTrack(state, { id: trackId }))
  const user = useSelector((state) => getUser(state, { id: track?.owner_id }))
  if (!track || !user) return null

  const {
    title,
    repost_count,
    save_count,
    play_count,
    description,
    genre,
    mood,
    release_date,
    duration,
    tags,
    field_visibility
  } = track
  const { handle, name } = user

  return (
    <Flex w='100%' direction='column'>
      <Box
        as='img'
        // @ts-ignore
        src={mockCoverArt}
        w='100%'
        h={376}
        css={{ position: 'absolute', top: 0, objectFit: 'cover' }}
      />
      <Box w='100%' css={{ maxWidth: 1080 }} pt={200} ph='l' alignSelf='center'>
        <Paper direction='column' w='100%'>
          <Flex p='l' gap='xl'>
            {/* @ts-ignore */}
            <Box as='img' src={mockTrackArt} h={320} w={320} borderRadius='m' />
            <Flex direction='column' gap='2xl'>
              <Flex direction='column' gap='l'>
                <Text variant='label'>Track</Text>
                <Flex direction='column' gap='s'>
                  <Text variant='heading' size='xl'>
                    {title}
                  </Text>
                  <Text
                    variant='body'
                    size='s'
                    strength='strong'
                    color='subdued'
                  >
                    By{' '}
                    <TextLink
                      size='m'
                      strength='default'
                      href={profilePage(handle)}
                      variant='visible'
                    >
                      {name}
                    </TextLink>
                  </Text>
                </Flex>
                <Flex gap='l'>
                  <PlainButton
                    variant='subdued'
                    size='large'
                    iconLeft={IconRepost}
                    css={{ padding: 0 }}
                  >
                    {formatCount(repost_count)} Reposts
                  </PlainButton>
                  <PlainButton
                    variant='subdued'
                    size='large'
                    iconLeft={IconHeart}
                    css={{ padding: 0 }}
                  >
                    {formatCount(save_count)} Favorites
                  </PlainButton>
                </Flex>
              </Flex>
              <Flex gap='xl' alignItems='center'>
                <Button iconLeft={IconPlay}>Play</Button>
                <Text variant='title' color='subdued'>
                  {formatCount(play_count)} Plays
                </Text>
              </Flex>
              <Flex gap='2xl'>
                <IconButton
                  icon={IconRepost}
                  aria-label='repost track'
                  size='2xl'
                  color='subdued'
                />
                <IconButton
                  icon={IconHeart as IconComponent}
                  aria-label='favorite track'
                  size='2xl'
                  color='subdued'
                />
                <IconButton
                  icon={IconShare}
                  aria-label='share track'
                  size='2xl'
                  color='subdued'
                />
                <IconButton
                  icon={IconKebabHorizontal}
                  aria-label='more options'
                  size='2xl'
                  color='subdued'
                />
              </Flex>
            </Flex>
          </Flex>
          <Divider />
          <Flex direction='column' backgroundColor='surface1' p='xl' gap='l'>
            <ServerUserGeneratedText>{description}</ServerUserGeneratedText>
            <Flex gap='l'>
              <Metadata attribute='genre' value={genre} />
              {mood ? <Metadata attribute='mood' value={mood} /> : null}
            </Flex>
            <Text variant='body' size='s' strength='strong'>
              {release_date ? `Released ${formatDate(release_date)}, ` : null}
              {duration ? formatSecondsAsText(duration) : null}
            </Text>
            {field_visibility?.tags && tags ? (
              <Flex gap='s'>
                {tags
                  .split(',')
                  .filter((t) => t)
                  .map((tag) => (
                    <Link key={tag} to={searchResultsPage(`#${tag}`)}>
                      <Tag>{tag}</Tag>
                    </Link>
                  ))}
              </Flex>
            ) : null}
          </Flex>
        </Paper>
      </Box>
      <Box />
    </Flex>
  )
}
