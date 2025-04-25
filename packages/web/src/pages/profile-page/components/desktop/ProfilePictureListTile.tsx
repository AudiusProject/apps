import { IconArrowRight, Paper, PlainButton } from '@audius/harmony'

import {
  UserProfileListProps,
  UserProfilePictureList
} from 'components/notification/Notification/components/UserProfilePictureList'

const messages = {
  viewAll: 'View All'
}

type ProfilePictureListTileProps = UserProfileListProps & {
  onClick: () => void
}

export const ProfilePictureListTile = ({
  onClick,
  users,
  totalUserCount,
  limit,
  disableProfileClick,
  disablePopover,
  stopPropagation,
  profilePictureClassname
}: ProfilePictureListTileProps) => {
  return (
    <Paper
      direction='column'
      gap='m'
      ph='m'
      pv='s'
      alignItems='flex-start'
      backgroundColor='white'
      onClick={onClick}
    >
      <UserProfilePictureList
        users={users}
        totalUserCount={totalUserCount}
        limit={limit}
        disableProfileClick={disableProfileClick}
        disablePopover={disablePopover}
        stopPropagation={stopPropagation}
        profilePictureClassname={profilePictureClassname}
      />
      <PlainButton variant='subdued' iconRight={IconArrowRight}>
        {messages.viewAll}
      </PlainButton>
    </Paper>
  )
}
