import { useCallback } from 'react'

import { Name } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Button, Flex, IconAlbum, IconNote, Text } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'

import { track, make } from 'services/analytics'
import { push as pushRoute } from 'utils/navigation'

const { UPLOAD_ALBUM_PAGE, UPLOAD_PAGE } = route

const messages = {
  header: (type: 'track' | 'album') => `You haven't uploaded any ${type}s yet`,
  label: (type: 'track' | 'album') =>
    `Upload a${type === 'album' ? 'n' : ''} ${type} and it will appear here.`,
  upload: 'Upload'
}

export const EmptyTabState = ({ type }: { type: 'track' | 'album' }) => {
  const dispatch = useDispatch()

  const handleUpload = useCallback(() => {
    dispatch(pushRoute(type === 'track' ? UPLOAD_PAGE : UPLOAD_ALBUM_PAGE))
    track(
      make({
        eventName: Name.TRACK_UPLOAD_OPEN,
        source: 'dashboard'
      })
    )
  }, [dispatch, type])

  return (
    <Flex w='100%' direction='column' alignItems='center' p='unit10' gap='2xl'>
      {type === 'track' ? (
        <IconNote size='3xl' color='subdued' />
      ) : (
        <IconAlbum size='3xl' color='subdued' />
      )}
      <Flex gap='l' direction='column' alignItems='center'>
        <Text variant='heading' size='s'>
          {messages.header(type)}
        </Text>
        <Text variant='body' size='l'>
          {messages.label(type)}
        </Text>
      </Flex>
      <Button variant='secondary' size='small' asChild onClick={handleUpload}>
        <Link to={UPLOAD_PAGE}>{messages.upload}</Link>
      </Button>
    </Flex>
  )
}
