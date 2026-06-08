import { Ref, useCallback, useMemo } from 'react'

import { Name, CreatePlaylistSource } from '@audius/common/models'
import { cacheCollectionsActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  PopupMenu,
  Box,
  HTMLButtonProps,
  IconCloudUpload,
  IconPlaylists,
  IconPlus,
  Text,
  IconCloudUpload as IconUpload,
  PopupMenuItem
} from '@audius/harmony'
import cn from 'classnames'
import { capitalize } from 'lodash'
import { useDispatch } from 'react-redux'

import { Tile } from 'components/tile'
import { track, make } from 'services/analytics'
import { push as pushRoute } from 'utils/navigation'

import styles from './UploadChip.module.css'
const { UPLOAD_PAGE } = route
const { createAlbum, createPlaylist } = cacheCollectionsActions

const getMessages = (type: 'track' | 'album' | 'playlist') => ({
  track: 'Upload Track',
  aTrack: 'Upload A Track',
  createNewCollection: (isFirst: boolean) =>
    `Create ${isFirst ? 'Your First' : 'New'} ${capitalize(type)}`,
  uploadCollection: `Upload ${type}`,
  createCollection: `Create ${type}`
})

type UploadChipProps = {
  type?: 'track' | 'album' | 'playlist'
  /**
   * nav: For display in a nav-like column
   *
   * card: Looks like a 'Card'
   *
   * tile: Looks like a 'TrackTile'
   */
  variant?: 'nav' | 'card' | 'tile'
  /**
   * Controls card sizing behavior when variant is `card`.
   * fixed: legacy 224x312 card dimensions
   * fluid: responsive card that fills its container while preserving proportions
   */
  cardStyle?: 'fixed' | 'fluid'
  /**
   * Is this upload the user's first of this type
   * */
  source: 'nav' | 'profile' | CreatePlaylistSource
  isFirst?: boolean
}

const UploadChip = ({
  type = 'track',
  variant = 'tile',
  cardStyle = 'fixed',
  isFirst = false,
  source
}: UploadChipProps) => {
  const messages = getMessages(type)
  const icon =
    type === 'track' ? (
      <IconUpload className={styles.iconUpload} />
    ) : (
      <IconPlus className={styles.iconPlus} color='subdued' />
    )

  let text: string
  switch (type) {
    case 'track':
      text = variant === 'nav' ? messages.track : messages.aTrack
      break
    case 'album':
    case 'playlist':
      text = messages.createNewCollection(isFirst)
      break
    default:
      break
  }

  const dispatch = useDispatch()

  const handleClickUpload = useCallback(() => {
    dispatch(pushRoute(UPLOAD_PAGE))
    track(
      make({
        eventName: Name.TRACK_UPLOAD_OPEN,
        source: source as 'nav' | 'profile'
      })
    )
  }, [dispatch, source])

  const handleCreateCollection = useCallback(() => {
    dispatch(
      (type === 'album' ? createAlbum : createPlaylist)(
        { playlist_name: `New ${type}` },
        source as CreatePlaylistSource,
        undefined,
        'route'
      )
    )
  }, [dispatch, source, type])

  const items: PopupMenuItem[] = useMemo(
    () =>
      type === 'track'
        ? []
        : [
            {
              text: messages.uploadCollection,
              icon: <IconCloudUpload />,
              onClick: handleClickUpload
            },
            {
              text: messages.createCollection,
              icon: <IconPlaylists />,
              onClick: handleCreateCollection
            }
          ],
    [type, messages, handleClickUpload, handleCreateCollection]
  )

  const renderTile = (props: HTMLButtonProps, ref?: Ref<HTMLButtonElement>) => (
    <Tile
      className={cn(styles.root, {
        [styles.nav]: variant === 'nav',
        [styles.card]: variant === 'card' && cardStyle === 'fixed',
        [styles.cardFluid]: variant === 'card' && cardStyle === 'fluid',
        [styles.tile]: variant === 'tile'
      })}
      as='button'
      ref={ref}
      {...props}
    >
      <span>{icon}</span>
      <Box w={variant === 'card' ? 100 : 'auto'}>
        <Text variant='title' size='m' color='subdued' strength='default'>
          {text}
        </Text>
      </Box>
    </Tile>
  )

  return type === 'track' ? (
    renderTile({
      onClick: type === 'track' ? handleClickUpload : handleCreateCollection
    })
  ) : (
    <PopupMenu
      items={items}
      anchorOrigin={{ horizontal: 'right', vertical: 'center' }}
      transformOrigin={{ horizontal: 'center', vertical: 'center' }}
      renderTrigger={(anchorRef, onClick, triggerProps) =>
        renderTile({ onClick: () => onClick(), ...triggerProps }, anchorRef)
      }
    />
  )
}

export default UploadChip
