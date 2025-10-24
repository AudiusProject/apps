import { useRemixContest, useTrack } from '@audius/common/api'
import {
  mobileOverflowMenuUISelectors,
  OverflowAction,
  OverflowSource
} from '@audius/common/store'
import { useSelector } from 'react-redux'

import ActionDrawer from 'app/components/action-drawer'

import type { ActionDrawerRow } from '../action-drawer/ActionDrawer'

import CollectionOverflowMenuDrawer from './CollectionOverflowMenuDrawer'
import ProfileOverflowMenuDrawer from './ProfileOverflowMenuDrawer'
import TrackOverflowMenuDrawer from './TrackOverflowMenuDrawer'

const { getMobileOverflowModal } = mobileOverflowMenuUISelectors

const overflowRowConfig = ({
  commentCount,
  isRemixContest = false
}: {
  commentCount: number | undefined
  isRemixContest: boolean
}): Record<OverflowAction, ActionDrawerRow> => ({
  [OverflowAction.REPOST]: { text: 'Repost' },
  [OverflowAction.UNREPOST]: { text: 'Unrepost' },
  [OverflowAction.FAVORITE]: { text: 'Favorite' },
  [OverflowAction.UNFAVORITE]: { text: 'Unfavorite' },
  [OverflowAction.SHARE]: { text: 'Share' },
  [OverflowAction.ADD_TO_ALBUM]: { text: 'Add To Album' },
  [OverflowAction.ADD_TO_PLAYLIST]: { text: 'Add To Playlist' },
  [OverflowAction.REMOVE_FROM_PLAYLIST]: {
    text: 'Remove From This Playlist',
    isDestructive: true
  },
  [OverflowAction.EDIT_ALBUM]: { text: 'Edit Album' },
  [OverflowAction.EDIT_PLAYLIST]: { text: 'Edit Playlist' },
  [OverflowAction.DELETE_ALBUM]: {
    text: 'Delete Album',
    isDestructive: true
  },
  [OverflowAction.DELETE_PLAYLIST]: {
    text: 'Delete Playlist',
    isDestructive: true
  },
  [OverflowAction.PUBLISH_PLAYLIST]: { text: 'Make Public' },
  [OverflowAction.VIEW_TRACK_PAGE]: { text: 'View Track Page' },
  [OverflowAction.VIEW_ARTIST_PAGE]: { text: 'View Profile' },
  [OverflowAction.VIEW_PLAYLIST_PAGE]: { text: 'View Playlist Page' },
  [OverflowAction.VIEW_ALBUM_PAGE]: { text: 'View Album Page' },
  [OverflowAction.FOLLOW_ARTIST]: { text: 'Follow Artist' },
  [OverflowAction.UNFOLLOW_ARTIST]: { text: 'Unfollow Artist' },
  [OverflowAction.FOLLOW]: { text: 'Follow' },
  [OverflowAction.UNFOLLOW]: { text: 'Unfollow' },
  [OverflowAction.EDIT_TRACK]: { text: 'Edit Track' },
  [OverflowAction.RELEASE_NOW]: { text: 'Release Now' },
  [OverflowAction.DELETE_TRACK]: { text: 'Delete Track', isDestructive: true },
  [OverflowAction.VIEW_EPISODE_PAGE]: { text: 'View Episode Page' },
  [OverflowAction.MARK_AS_PLAYED]: { text: 'Mark as Played' },
  [OverflowAction.MARK_AS_UNPLAYED]: { text: 'Mark as Unplayed' },
  [OverflowAction.PURCHASE_TRACK]: { text: 'Purchase Track' },
  [OverflowAction.SET_ARTIST_PICK]: { text: 'Set as Artist Pick' },
  [OverflowAction.UNSET_ARTIST_PICK]: { text: 'Unset as Artist Pick' },
  [OverflowAction.VIEW_COMMENTS]: {
    text:
      commentCount !== undefined
        ? `View (${commentCount}) Comments`
        : 'View Comments' // slightly better than incorrectly showing a 0 count
  },
  [OverflowAction.HOST_REMIX_CONTEST]: {
    text: isRemixContest ? 'Edit Remix Contest' : 'Host Remix Contest'
  }
})

export const OverflowMenuDrawer = () => {
  const overflowMenu = useSelector(getMobileOverflowModal)

  const id =
    overflowMenu.id !== null && overflowMenu !== undefined
      ? +overflowMenu.id
      : undefined

  const { data: commentCount } = useTrack(id, {
    select: (track) => {
      return track.comment_count
    }
  })

  const { data: remixContest } = useRemixContest(id)
  const isRemixContest = !!remixContest

  if (!overflowMenu?.id) {
    return <></>
  }

  const { source, overflowActions } = overflowMenu

  const OverflowDrawerComponent =
    {
      [OverflowSource.TRACKS]: TrackOverflowMenuDrawer,
      [OverflowSource.COLLECTIONS]: CollectionOverflowMenuDrawer,
      // No case for NOTIFICATIONS because there currently isn't an overflow menu on notifications
      [OverflowSource.PROFILE]: ProfileOverflowMenuDrawer
    }[source] ?? TrackOverflowMenuDrawer

  return (
    <OverflowDrawerComponent
      render={(callbacks) => {
        const rows = (overflowActions ?? []).map((action) => ({
          ...overflowRowConfig({ commentCount, isRemixContest })[action],
          callback: callbacks[action]
        }))
        return <ActionDrawer modalName='Overflow' rows={rows} />
      }}
    />
  )
}
