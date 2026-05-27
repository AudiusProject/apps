import { useCallback, useContext, useEffect } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import {
  useIsManagedAccount,
  useShareAction,
  useShareContent
} from '@audius/common/hooks'
import { Name, PlayableType } from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import {
  collectionsSocialActions,
  tracksSocialActions,
  usersSocialActions,
  shareModalUISelectors,
  modalsActions,
  useCreateChatModal
} from '@audius/common/store'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import * as embedModalActions from 'components/embed-modal/store/actions'
import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { SHARE_TOAST_TIMEOUT_MILLIS } from 'utils/constants'
import { useSelector } from 'utils/reducer'
import { openXLink } from 'utils/xShare'

import { ShareDialog } from './components/ShareDialog'
import { ShareDrawer } from './components/ShareDrawer'
import { messages } from './messages'
import { getXShareText } from './utils'

const { getShareRequest, getShareSource } = shareModalUISelectors
const { shareUser } = usersSocialActions
const { shareTrack, shareContest } = tracksSocialActions
const { shareCollection } = collectionsSocialActions
const { setVisibility } = modalsActions

export const ShareModal = NiceModal.create(() => {
  const modal = useModal()
  const isOpen = modal.visible
  const onClose = useCallback(() => {
    modal.hide()
  }, [modal])
  // NiceModal handles unmount via `remove()` after the close animation;
  // there's no separate "fully closed" callback, so reuse onClose here.
  const onClosed = onClose
  const sendShareAction = useShareAction()

  const { toast } = useContext(ToastContext)
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const record = useRecord()
  const request = useSelector(getShareRequest)
  const source = useSelector(getShareSource)
  const content = useShareContent(request)
  const { data: accountUserId } = useCurrentUserId()
  const { onOpen: openCreateChatModal } = useCreateChatModal()
  const isManagerMode = useIsManagedAccount()

  const isOwner =
    (content?.type === 'track' || content?.type === 'contest') &&
    accountUserId === content.artist.user_id

  const handleShareToDirectMessage = useCallback(async () => {
    if (!content) return
    onClose()
    openCreateChatModal({
      // Just care about the link
      presetMessage: (await getXShareText(content, false)).link,
      onCancelAction: setVisibility({ modal: 'Share', visible: true }),
      defaultUserList: 'chats'
    })
    dispatch(make(Name.CHAT_ENTRY_POINT, { source: 'share' }))
  }, [openCreateChatModal, dispatch, onClose, content])

  const handleShareToX = useCallback(async () => {
    if (!source || !content) return
    const { xText, link, analyticsEvent } = await getXShareText(content)
    openXLink(link, xText)
    record(make(Name.SHARE_TO_TWITTER, { source, ...analyticsEvent }))
    onClose()
  }, [source, content, record, onClose])

  const handleCopyLink = useCallback(() => {
    if (!source || !content) return
    switch (content.type) {
      case 'track':
        dispatch(shareTrack(content.track.track_id, source))
        break
      case 'contest':
        // Contest copy-link uses the dedicated `shareContest` saga,
        // which writes the contest URL (`{permalink}/contest`) to
        // the clipboard rather than the track permalink.
        dispatch(shareContest(content.track.track_id, source))
        break
      case 'profile':
        dispatch(shareUser(content.profile.user_id, source))
        break
      case 'album':
        dispatch(shareCollection(content.album.playlist_id, source))
        break
      case 'playlist':
        dispatch(shareCollection(content.playlist.playlist_id, source))
        break
    }
    toast(messages.toast(content.type), SHARE_TOAST_TIMEOUT_MILLIS)
    onClose()
  }, [dispatch, toast, content, source, onClose])

  const handleEmbed = useCallback(() => {
    if (content?.type === 'track') {
      dispatch(
        embedModalActions.open(content.track.track_id, PlayableType.TRACK)
      )
      onClose()
    } else if (content?.type === 'playlist') {
      dispatch(
        embedModalActions.open(
          content.playlist.playlist_id,
          PlayableType.PLAYLIST
        )
      )
      onClose()
    } else if (content?.type === 'album') {
      dispatch(
        embedModalActions.open(content.album.playlist_id, PlayableType.ALBUM)
      )
      onClose()
    }
  }, [content, dispatch, onClose])

  // Trigger share action on mount with new content
  useEffect(() => {
    if (!content) return
    switch (content.type) {
      case 'track':
        sendShareAction(content.track.track_id, 'track')
        break
      case 'album':
        sendShareAction(content.album.playlist_id, 'playlist')
        break
      case 'playlist':
        sendShareAction(content.playlist.playlist_id, 'playlist')
    }
  }, [content, sendShareAction])

  const shareProps = {
    isOpen,
    isOwner,
    // Disable DM share in manager mode since we can't do that as a managed user
    onShareToDirectMessage: isManagerMode
      ? undefined
      : handleShareToDirectMessage,
    onShareToX: handleShareToX,
    onCopyLink: handleCopyLink,
    onEmbed: ['playlist', 'album', 'track'].includes(content?.type ?? '')
      ? handleEmbed
      : undefined,
    onClose,
    onClosed,
    shareType: content?.type ?? 'track',
    isPrivate:
      content?.type === 'playlist' ? content.playlist.is_private : false
  }

  if (isMobile) return <ShareDrawer {...shareProps} />
  return <ShareDialog {...shareProps} />
})

// Register the modal so saga code (and anything else outside React) can
// open it via `showNiceModal('Share')`. The id is also added to the
// nice-modal bridge allowlist so legacy `setVisibility('Share', true)`
// dispatches translate to `showNiceModal('Share')`.
NiceModal.register('Share', ShareModal)
registerNiceModalId('Share')
