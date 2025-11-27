import { type Collection, type User } from '@audius/common/models'
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
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Paper } from '@audius/harmony/src/components/layout/Paper'
import { Text } from '@audius/harmony/src/components/text'
import { TextLink } from '@audius/harmony/src/components/text-link'

import { ServerUserGeneratedText } from 'components/user-generated-text/ServerUserGeneratedText'
import { profilePage } from 'utils/route'

type DesktopServerCollectionPageProps = {
  collection: Collection
  user: User
}

export const DesktopServerCollectionPage = ({
  collection,
  user
}: DesktopServerCollectionPageProps) => {
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
    <Flex w='100%' direction='column'>
      <Box w='100%' css={{ maxWidth: 1096 }} pt={112} ph='l' alignSelf='center'>
        <Paper direction='column' w='100%'>
          <Flex p='l' direction='row' gap='xl'>
            <Artwork
              src={artwork?.['480x480']}
              h={270}
              w={270}
              isLoading={false}
            />
            <Flex direction='column' justifyContent='space-between'>
              <Flex direction='column' gap='xl' pt='s'>
                <Text variant='label' color='subdued'>
                  {is_album ? 'Album' : 'Playlist'}
                </Text>
                <Flex direction='column' gap='s'>
                  <Text variant='heading' size='xl'>
                    {playlist_name}
                  </Text>
                  <Text variant='body' strength='strong' color='subdued'>
                    By{' '}
                    <TextLink
                      href={profilePage(handle)}
                      variant='visible'
                      size='m'
                      strength='default'
                    >
                      {name}
                    </TextLink>
                  </Text>
                </Flex>
                {repost_count > 0 && save_count > 0 ? (
                  <Flex gap='l'>
                    {repost_count > 0 ? (
                      <PlainButton
                        variant='subdued'
                        size='large'
                        iconLeft={IconRepost}
                        css={{ padding: 0 }}
                      >
                        {formatCount(repost_count)} Reposts
                      </PlainButton>
                    ) : null}
                    {save_count > 0 ? (
                      <PlainButton
                        variant='subdued'
                        size='large'
                        iconLeft={IconHeart}
                        css={{ padding: 0 }}
                      >
                        {formatCount(save_count)} Favorites
                      </PlainButton>
                    ) : null}
                  </Flex>
                ) : null}
              </Flex>
              <Flex gap='2xl'>
                <Button iconLeft={IconPlay} size='large'>
                  Play
                </Button>
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
          <Flex
            backgroundColor='surface1'
            borderTop='default'
            borderBottom='default'
            p='xl'
            gap='xl'
          >
            <Flex direction='column' gap='l'>
              <ServerUserGeneratedText>{description}</ServerUserGeneratedText>
            </Flex>
          </Flex>
        </Paper>
      </Box>
    </Flex>
  )
}
