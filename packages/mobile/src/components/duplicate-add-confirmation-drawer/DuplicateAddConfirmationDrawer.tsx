import { useCallback } from 'react'

import { useCollection } from '@audius/common/api'
import {
  cacheCollectionsActions,
  duplicateAddConfirmationModalUISelectors
} from '@audius/common/store'
import { fillString } from '@audius/common/utils'
import { capitalize, pick } from 'lodash'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Button } from '@audius/harmony-native'
import { Text } from 'app/components/core'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'

import { useDrawerState } from '../drawer'
import Drawer from '../drawer/Drawer'
const { getPlaylistId, getTrackId } = duplicateAddConfirmationModalUISelectors
const { addTrackToPlaylist } = cacheCollectionsActions

const getMessages = (collectionType: 'album' | 'playlist') => ({
  drawerTitle: 'Already Added',
  drawerBody: `This is already in your%0 ${collectionType}.`,
  buttonAddText: 'Add Anyway',
  buttonCancelText: "Don't Add",
  addedToast: `Added To ${capitalize(collectionType)}!`
})

const useStyles = makeStyles(({ palette, spacing }) => ({
  title: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(2),
    alignItems: 'center',
    paddingVertical: spacing(6),
    borderBottomColor: palette.neutralLight8,
    borderBottomWidth: 1
  },
  titleText: {
    textTransform: 'uppercase'
  },
  container: {
    marginHorizontal: spacing(4)
  },
  body: {
    margin: spacing(4),
    lineHeight: spacing(6),
    textAlign: 'center'
  },
  buttonContainer: {
    gap: spacing(2),
    marginBottom: spacing(8)
  }
}))

export const DuplicateAddConfirmationDrawer = () => {
  const playlistId = useSelector(getPlaylistId)
  const trackId = useSelector(getTrackId)
  const { data: partialPlaylist } = useCollection(playlistId, {
    select: (collection) => pick(collection, 'is_album', 'playlist_name')
  })
  const dispatch = useDispatch()
  const styles = useStyles()
  const { toast } = useToast()
  const { isOpen, onClose } = useDrawerState('DuplicateAddConfirmation')

  const messages = getMessages(partialPlaylist?.is_album ? 'album' : 'playlist')

  const handleAdd = useCallback(() => {
    if (playlistId && trackId) {
      toast({ content: messages.addedToast })
      dispatch(addTrackToPlaylist(trackId, playlistId, { silent: true }))
    }
    onClose()
  }, [playlistId, trackId, onClose, toast, messages.addedToast, dispatch])

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.title}>
          <Text
            weight='heavy'
            color='neutral'
            fontSize='xl'
            style={styles.titleText}
          >
            {messages.drawerTitle}
          </Text>
        </View>
        <Text style={styles.body} fontSize='large' weight='medium'>
          {fillString(
            messages.drawerBody,
            partialPlaylist ? ` "${partialPlaylist.playlist_name}"` : ''
          )}
        </Text>
        <View style={styles.buttonContainer}>
          <Button variant='primary' fullWidth onPress={onClose}>
            {messages.buttonCancelText}
          </Button>
          <Button variant='secondary' fullWidth onPress={handleAdd}>
            {messages.buttonAddText}
          </Button>
        </View>
      </View>
    </Drawer>
  )
}
