import { useRef } from 'react'

import { useCurrentUserId, useUser } from '@audius/common/api'
import { useIsManagedAccount } from '@audius/common/hooks'
import { ID, statusIsNotFinalized } from '@audius/common/models'
import { chatSelectors } from '@audius/common/store'
import {
  IconMessageBlock,
  IconMessageUnblock,
  IconMessageLocked,
  IconShare,
  IconPencil,
  IconKebabHorizontal,
  IconMessage,
  PopupMenu,
  Button,
  FollowButton,
  Flex,
  Skeleton,
  Box
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import { ArtistRecommendationsPopup } from 'components/artist-recommendations/ArtistRecommendationsPopup'
import Stats, { StatProps } from 'components/stats/Stats'
import SubscribeButton from 'components/subscribe-button/SubscribeButton'
import { zIndex } from 'utils/zIndex'
const { getChatPermissionsStatus } = chatSelectors

const BUTTON_COLLAPSE_WIDTHS = {
  first: 1066,
  second: 1140
}

const messages = {
  more: 'More Options',
  share: 'Share',
  shareProfile: 'Share Profile',
  edit: 'Edit Page',
  cancel: 'Cancel',
  save: 'Save Changes',
  message: 'Send Message',
  unblockMessages: 'Unblock Messages',
  blockMessages: 'Block Messages',
  unmuteComments: 'Unmute Comments',
  muteComments: 'Mute Comments'
}

export type ProfileMode = 'visitor' | 'owner' | 'editing'

type StatsBannerProps = {
  stats?: StatProps[]
  mode?: ProfileMode
  profileId?: number
  areArtistRecommendationsVisible?: boolean
  onCloseArtistRecommendations?: () => void
  onEdit?: () => void
  onShare?: () => void
  onSave?: () => void
  onCancel?: () => void
  onFollow?: () => void
  onUnfollow?: () => void
  canCreateChat?: boolean
  onMessage?: () => void
  onBlock?: () => void
  onUnblock?: () => void
  onMute?: () => void
  onUnmute?: () => void
  isBlocked?: boolean
  isMuted?: boolean
  accountUserId?: number | null
}

type StatsMenuPopupProps = {
  onShare: () => void
  accountUserId?: ID | null
  isBlocked?: boolean
  isMuted?: boolean
  onBlock: () => void
  onUnblock: () => void
  onMute: () => void
}

const StatsPopupMenu = ({
  onShare,
  accountUserId,
  isBlocked,
  isMuted,
  onBlock,
  onUnblock,
  onMute
}: StatsMenuPopupProps) => {
  const isManagedAccount = useIsManagedAccount()
  const menuItems = [
    {
      text: messages.shareProfile,
      onClick: onShare,
      icon: <IconShare />
    }
  ]

  if (accountUserId && !isManagedAccount) {
    menuItems.push(
      isBlocked
        ? {
            text: messages.unblockMessages,
            onClick: onUnblock,
            icon: <IconMessageUnblock />
          }
        : {
            text: messages.blockMessages,
            onClick: onBlock,
            icon: <IconMessageBlock />
          }
    )
  }

  if (accountUserId) {
    menuItems.push(
      isMuted
        ? {
            text: messages.unmuteComments,
            onClick: onMute,
            icon: <IconMessageUnblock />
          }
        : {
            text: messages.muteComments,
            onClick: onMute,
            icon: <IconMessageBlock />
          }
    )
  }
  return (
    <PopupMenu
      items={menuItems}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      renderTrigger={(anchorRef, triggerPopup) => (
        <Button
          ref={anchorRef}
          variant='secondary'
          size='small'
          aria-label={messages.more}
          iconLeft={IconKebabHorizontal}
          onClick={() => triggerPopup()}
        />
      )}
    />
  )
}

export const StatBanner = (props: StatsBannerProps) => {
  const {
    stats = [
      { number: 0, title: 'tracks' },
      { number: 0, title: 'followers' },
      { number: 0, title: 'reposts' }
    ] as StatProps[],
    mode = 'visitor',
    profileId,
    areArtistRecommendationsVisible = false,
    onCloseArtistRecommendations,
    onEdit,
    onShare,
    onSave,
    onCancel,
    onFollow,
    onUnfollow,
    canCreateChat,
    onMessage,
    onBlock,
    onUnblock,
    onMute,
    isBlocked,
    isMuted,
    accountUserId
  } = props
  let buttons = null
  const followButtonRef = useRef<HTMLButtonElement>(null)
  const isManagedAccount = useIsManagedAccount()
  const chatPermissionStatus = useSelector(getChatPermissionsStatus)
  const { data: currentUserId } = useCurrentUserId()
  const { data: isFollowing } = useUser(profileId, {
    select: (user) => user.does_current_user_follow
  })

  const shareButton = (
    <Button
      variant='secondary'
      size='small'
      iconLeft={IconShare}
      onClick={onShare}
      widthToHideText={BUTTON_COLLAPSE_WIDTHS.first}
    >
      {messages.share}
    </Button>
  )

  switch (mode) {
    case 'owner':
      buttons = (
        <>
          {shareButton}
          <Button
            variant='secondary'
            size='small'
            iconLeft={IconPencil}
            onClick={onEdit}
            widthToHideText={BUTTON_COLLAPSE_WIDTHS.second}
          >
            {messages.edit}
          </Button>
        </>
      )
      break
    case 'editing':
      buttons = (
        <>
          <Button variant='secondary' size='small' onClick={onCancel}>
            {messages.cancel}
          </Button>
          <Button variant='primary' size='small' onClick={onSave}>
            {messages.save}
          </Button>
        </>
      )
      break
    default:
      buttons = (
        <>
          {onShare && onUnblock && onBlock && onMute ? (
            <>
              <StatsPopupMenu
                onShare={onShare}
                accountUserId={accountUserId}
                isBlocked={isBlocked}
                isMuted={isMuted}
                onBlock={onBlock}
                onUnblock={onUnblock}
                onMute={onMute}
              />
              {onMessage && !isManagedAccount ? (
                statusIsNotFinalized(chatPermissionStatus) && currentUserId ? (
                  <Skeleton w={40} h={32} css={{ flexShrink: 0 }} />
                ) : (
                  <Button
                    variant='secondary'
                    size='small'
                    aria-label={messages.message}
                    iconLeft={canCreateChat ? IconMessage : IconMessageLocked}
                    onClick={onMessage}
                  />
                )
              ) : null}
            </>
          ) : (
            shareButton
          )}

          <>
            {isFollowing && profileId ? (
              <SubscribeButton userId={profileId} />
            ) : null}
            <FollowButton
              ref={followButtonRef}
              isFollowing={isFollowing}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
            />

            <ArtistRecommendationsPopup
              anchorRef={followButtonRef}
              artistId={profileId!}
              isVisible={areArtistRecommendationsVisible}
              onClose={onCloseArtistRecommendations!}
            />
          </>
        </>
      )
      break
  }

  return (
    <Flex
      justifyContent='space-between'
      alignItems='center'
      flex='1 1 100%'
      data-testid='stat-banner'
    >
      <Box w={330}>
        <Stats clickable userId={profileId!} stats={stats} size='large' />
      </Box>
      <Flex
        justifyContent='flex-end'
        gap='s'
        alignItems='center'
        css={{ zIndex: zIndex.PROFILE_EDITABLE_COMPONENTS }}
      >
        {buttons}
      </Flex>
    </Flex>
  )
}

export const EmptyStatBanner = () => (
  <Box h='unit14' w='100%' backgroundColor='surface1' borderBottom='default' />
)
