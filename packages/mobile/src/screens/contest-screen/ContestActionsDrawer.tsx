import { useCallback, useMemo } from 'react'

import {
  useCurrentUserId,
  useEventFollowState,
  useFollowEvent,
  useRemixContest,
  useTrack,
  useUnfollowEvent
} from '@audius/common/api'
import { ShareSource } from '@audius/common/models'
import { shareModalUIActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import {
  IconShare,
  IconUserFollow,
  IconUserFollowing,
  useTheme
} from '@audius/harmony-native'
import ActionDrawer from 'app/components/action-drawer'
import { useDrawer } from 'app/hooks/useDrawer'
import { setVisibility } from 'app/store/drawers/slice'

const CONTEST_ACTIONS_DRAWER_NAME = 'ContestActions'

const messages = {
  follow: 'Follow Contest',
  unfollow: 'Unfollow Contest',
  share: 'Share Contest'
}

/**
 * Overflow action sheet for the contest screen — fired from the
 * kebab button in `ContestNavOverlay`. Matches the
 * `ProfileActionsDrawer` pattern (ActionDrawer backed by our
 * drawer-slice visibility), and surfaces the two actions the Figma
 * calls out for non-host viewers: follow/unfollow the contest, and
 * share the contest. The host only sees Share — following your own
 * event isn't meaningful.
 *
 * Event id + track id come in via the drawer `data` payload. We
 * read the current follow state off the shared tan-query hook so
 * the label flips between "Follow Contest" and "Unfollow Contest"
 * without needing to re-render on each open.
 */
export const ContestActionsDrawer = () => {
  const dispatch = useDispatch()
  const { color } = useTheme()
  const { data } = useDrawer('ContestActions')
  const { eventId, trackId } = data ?? {}

  // ActionDrawer's default Text color is `secondary` (accent purple).
  // The Figma spec for the contest overflow calls for the action
  // labels to match their icons in the neutral/default text color,
  // so pass an explicit override style on each row — `style` is
  // spread onto the row's Text inside `ActionDrawer`.
  const rowStyle = { color: color.text.default }

  const { data: currentUserId } = useCurrentUserId()
  const { data: track } = useTrack(trackId ?? null)
  const { data: contest } = useRemixContest(trackId ?? undefined)
  const { data: followState } = useEventFollowState(eventId)
  const { mutate: followEvent } = useFollowEvent()
  const { mutate: unfollowEvent } = useUnfollowEvent()

  const isOwner =
    !!currentUserId &&
    (currentUserId === track?.owner_id ||
      currentUserId === (contest as any)?.userId)

  const close = useCallback(() => {
    dispatch(setVisibility({ drawer: 'ContestActions', visible: false }))
  }, [dispatch])

  const handleToggleFollow = useCallback(() => {
    if (!eventId || !currentUserId) {
      close()
      return
    }
    close()
    if (followState?.isFollowed) {
      unfollowEvent({ userId: currentUserId, eventId })
    } else {
      followEvent({ userId: currentUserId, eventId })
    }
  }, [
    close,
    eventId,
    currentUserId,
    followState?.isFollowed,
    followEvent,
    unfollowEvent
  ])

  const handleShare = useCallback(() => {
    close()
    if (!trackId) return
    dispatch(
      shareModalUIActions.requestOpen({
        type: 'contest',
        trackId,
        source: ShareSource.PAGE
      })
    )
  }, [close, dispatch, trackId])

  const rows = useMemo(() => {
    const follow = {
      text: followState?.isFollowed ? messages.unfollow : messages.follow,
      icon: followState?.isFollowed ? (
        <IconUserFollowing size='l' color='default' />
      ) : (
        <IconUserFollow size='l' color='default' />
      ),
      callback: handleToggleFollow,
      style: rowStyle
    }
    const share = {
      text: messages.share,
      icon: <IconShare size='l' color='default' />,
      callback: handleShare,
      style: rowStyle
    }
    return isOwner ? [share] : [follow, share]
  }, [followState?.isFollowed, handleToggleFollow, handleShare, isOwner, rowStyle])

  return <ActionDrawer drawerName={CONTEST_ACTIONS_DRAWER_NAME} rows={rows} />
}
