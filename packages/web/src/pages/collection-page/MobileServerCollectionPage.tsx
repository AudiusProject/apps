import type { Collection, User } from '@audius/common/models'
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
import { Divider } from '@audius/harmony/src/components/layout/Divider'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Paper } from '@audius/harmony/src/components/layout/Paper'
import { Text } from '@audius/harmony/src/components/text'
import { TextLink } from '@audius/harmony/src/components/text-link'

import { ServerUserGeneratedText } from 'components/user-generated-text/ServerUserGeneratedText'
import { profilePage } from 'utils/route'

import { ServerTrackList } from './components/ServerTrackList'

type MobileServerCollectionPageProps = {
  collection: Collection
  user: User
}

export const MobileServerCollectionPage = ({
  collection,
  user
}: MobileServerCollectionPageProps) => {
  const {
    artwork,
    is_album,
    playlist_name,
    repost_count,
    save_count,
    description
  } = collection

  const { handle, name } = user

  return (
    <Flex direction='column' backgroundColor='default' p='l'>
      <Paper direction='column'>
        <Flex direction='column' p='l' gap='l' w='100%' alignItems='center'>
          <Text variant='label' color='subdued'>
            {is_album ? 'Album' : 'Playlist'}
          </Text>
          <Artwork
            src={artwork?.['480x480']}
            isLoading={false}
            h={224}
            w={224}
          />
          <Flex direction='column' gap='s'>
            <Text variant='heading' size='s'>
              {playlist_name}
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
          {repost_count > 0 && save_count > 0 ? (
            <Flex gap='xl'>
              {repost_count > 0 ? (
                <PlainButton iconLeft={IconRepost} css={{ padding: 0 }}>
                  {formatCount(repost_count)} Reposts
                </PlainButton>
              ) : null}
              {save_count > 0 ? (
                <PlainButton iconLeft={IconHeart} css={{ padding: 0 }}>
                  {formatCount(save_count)} Favorites
                </PlainButton>
              ) : null}
            </Flex>
          ) : null}
          <ServerUserGeneratedText>{description}</ServerUserGeneratedText>
        </Flex>
        <Divider />
        <ServerTrackList collection={collection} />
      </Paper>
    </Flex>
  )
}
