import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { useLinkTo } from '@react-navigation/native'
import { ImageBackground } from 'react-native'

import {
  Avatar,
  Button,
  Flex,
  IconArrowRight,
  Text
} from '@audius/harmony-native'
import imageCoverPhotoBlank from 'app/assets/images/imageCoverPhotoBlank.jpg'
import imageProfilePicEmpty from 'app/assets/images/imageProfilePicEmpty2X.png'

const { FEED_PAGE } = route

const COVER_PHOTO_HEIGHT = 96

const messages = {
  helpText: 'This Account No Longer Exists',
  description: 'The account you’re looking for has been deleted.',
  buttonText: 'Take Me Back To The Music'
}

export const DeactivatedProfileTombstone = () => {
  const linkTo = useLinkTo()

  const handlePress = useCallback(() => {
    linkTo(FEED_PAGE)
  }, [linkTo])

  return (
    <Flex flex={1} column backgroundColor='white'>
      <ImageBackground
        source={imageCoverPhotoBlank}
        style={{ height: COVER_PHOTO_HEIGHT }}
        resizeMode='repeat'
      />
      {/* Fills the remaining viewport so the message sits centered rather
          than pinned beneath the cover photo. */}
      <Flex
        flex={1}
        column
        alignItems='center'
        justifyContent='center'
        gap='xl'
        ph='l'
        pv='2xl'
      >
        <Avatar source={imageProfilePicEmpty} size='xxl' variant='strong' />
        <Flex column alignItems='center' gap='s'>
          <Text variant='heading' size='s' textAlign='center'>
            {messages.helpText}
          </Text>
          <Text variant='body' size='l' color='subdued' textAlign='center'>
            {messages.description}
          </Text>
        </Flex>
        <Button
          variant='primary'
          fullWidth
          iconRight={IconArrowRight}
          onPress={handlePress}
        >
          {messages.buttonText}
        </Button>
      </Flex>
    </Flex>
  )
}
