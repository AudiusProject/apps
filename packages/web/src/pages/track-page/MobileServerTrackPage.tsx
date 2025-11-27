import { SquareSizes, WidthSizes } from '@audius/common/src/models/ImageSizes'
import { Track } from '@audius/common/src/models/Track'
import { User } from '@audius/common/src/models/User'
import { formatCount } from '@audius/common/src/utils/decimal'
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
import { Box } from '@audius/harmony/src/components/layout/Box'
import { Divider } from '@audius/harmony/src/components/layout/Divider'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Paper } from '@audius/harmony/src/components/layout/Paper'
import { Tag } from '@audius/harmony/src/components/tag'
import { Text } from '@audius/harmony/src/components/text'
import { TextLink } from '@audius/harmony/src/components/text-link'
import { Link } from 'react-router-dom'

import { ServerUserGeneratedText } from 'components/user-generated-text/ServerUserGeneratedText'
import { profilePage, searchResultsPage } from 'utils/route'

import { Metadata } from './components/Metadata'

// Inlined formatDate to avoid dayjs dependency
const formatDate = (date: string, format?: string): string => {
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return date
  }
  const formatStr = format || 'M/D/YY'
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()
  const year = dateObj.getFullYear().toString().slice(-2)
  return formatStr
    .replace(/YY/g, year)
    .replace(/M/g, month.toString())
    .replace(/D/g, day.toString())
}

// Inlined formatSecondsAsText to avoid dayjs dependency
const formatSecondsAsText = (seconds: number): string => {
  const SECONDS_PER_HOUR = 3600
  const hours = Math.floor(seconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / 60)
  const secs = seconds % 60

  if (seconds >= SECONDS_PER_HOUR) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m ${secs}s`
  }
}

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
    artwork
  } = track
  const { handle, name, cover_photo, profile_picture } = user

  // Use user cover photo as primary, fallback to profile picture with blur
  const coverPhotoUrl =
    cover_photo?.[WidthSizes.SIZE_2000] ??
    profile_picture?.[SquareSizes.SIZE_1000_BY_1000] ??
    null
  const useBlurFallback =
    !cover_photo?.[WidthSizes.SIZE_2000] && profile_picture

  return (
    <Flex direction='column' backgroundColor='default'>
      {coverPhotoUrl ? (
        <Box
          as='img'
          // @ts-ignore
          src={coverPhotoUrl}
          w='100%'
          h={96}
          css={{
            objectFit: 'cover',
            filter: useBlurFallback ? 'blur(20px)' : undefined,
            transform: useBlurFallback ? 'scale(1.1)' : undefined
          }}
        />
      ) : (
        <Box w='100%' h={96} backgroundColor='surface1' />
      )}
      <Flex direction='column' backgroundColor='default' p='l'>
        <Paper direction='column'>
          <Flex direction='column' p='l' gap='l' w='100%' alignItems='center'>
            <Text variant='label' color='subdued'>
              Track
            </Text>
            <Artwork
              src={artwork['480x480']}
              isLoading={false}
              h={224}
              w={224}
            />
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
    </Flex>
  )
}
