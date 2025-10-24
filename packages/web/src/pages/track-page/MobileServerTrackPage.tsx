import { Track } from '@audius/common/src/models/Track'
import { User } from '@audius/common/src/models/User'
import { formatCount } from '@audius/common/src/utils/decimal'
import { profilePage } from '@audius/common/src/utils/route'
import {
  formatDate,
  formatSecondsAsText
} from '@audius/common/src/utils/timeUtil'
import IconHeart from '@audius/harmony/src/assets/icons/Heart.svg'
import IconKebabHorizontal from '@audius/harmony/src/assets/icons/KebabHorizontal.svg'
import IconPlay from '@audius/harmony/src/assets/icons/Play.svg'
import IconRepost from '@audius/harmony/src/assets/icons/Repost.svg'
import IconShare from '@audius/harmony/src/assets/icons/Share.svg'
import { Artwork } from '@audius/harmony/src/components/artwork/Artwork'
import { Button } from '@audius/harmony/src/components/button/Button/Button'
import { IconButton } from '@audius/harmony/src/components/button/IconButton/IconButton'
import { PlainButton } from '@audius/harmony/src/components/button/PlainButton/PlainButton'
import { IconComponent } from '@audius/harmony/src/components/icon'
import { Divider } from '@audius/harmony/src/components/layout/Divider'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Paper } from '@audius/harmony/src/components/layout/Paper'
import { Tag } from '@audius/harmony/src/components/tag'
import { Text } from '@audius/harmony/src/components/text'
import { TextLink } from '@audius/harmony/src/components/text-link'
import { Link } from 'react-router-dom'

import { ServerUserGeneratedText } from 'components/user-generated-text/ServerUserGeneratedText'
import { searchResultsPage } from 'utils/route'

import { Metadata } from './components/Metadata'

type MobileServerTrackPageProps = {
  track: Track
  user: User
}

export const MobileServerTrackPage = ({
  track,
  user
}: MobileServerTrackPageProps) => {
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
    field_visibility,
    cover_art
  } = track
  const { handle, name } = user

  return (
    <Flex direction='column' backgroundColor='default' p='l'>
      <Paper direction='column'>
        <Flex direction='column' p='l' gap='l' w='100%' alignItems='center'>
          <Text variant='label' color='subdued'>
            Track
          </Text>
          <Artwork src={cover_art!} isLoading={false} h={224} w={224} />
          <Flex direction='column' gap='s'>
            <Text variant='heading' size='s'>
              {title}
            </Text>
            <TextLink
              href={profilePage(handle)}
              variant='visible'
              size='l'
              css={{ alignSelf: 'center' }}
            >
              {name}
            </TextLink>
          </Flex>
          <Button iconLeft={IconPlay} fullWidth>
            Play
          </Button>
          <Flex gap='xl'>
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
        <Divider />
        <Flex direction='column' backgroundColor='surface1' p='l' gap='l'>
          <Flex gap='xl'>
            <PlainButton iconLeft={IconRepost} css={{ padding: 0 }}>
              {formatCount(repost_count)} Reposts
            </PlainButton>
            <PlainButton iconLeft={IconHeart} css={{ padding: 0 }}>
              {formatCount(save_count)} Favorites
            </PlainButton>
          </Flex>
          <ServerUserGeneratedText>{description}</ServerUserGeneratedText>
          <Flex gap='l'>
            <Metadata attribute='genre' value={genre} />
            {mood ? <Metadata attribute='mood' value={mood} /> : null}
          </Flex>
          <Text variant='body' size='s' strength='strong'>
            {release_date ? `Released ${formatDate(release_date)}, ` : null}
            {duration ? `${formatSecondsAsText(duration)}, ` : null}
            {formatCount(play_count)} Plays
          </Text>
          {field_visibility?.tags && tags ? (
            <Flex gap='s'>
              {tags
                .split(',')
                .filter((t) => t)
                .map((tag) => (
                  <Link key={tag} to={searchResultsPage('all', `#${tag}`)}>
                    <Tag>{tag}</Tag>
                  </Link>
                ))}
            </Flex>
          ) : null}
        </Flex>
      </Paper>
    </Flex>
  )
}
