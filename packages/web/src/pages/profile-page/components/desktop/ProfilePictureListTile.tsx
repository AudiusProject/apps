import { IconArrowRight, Paper, PlainButton } from '@audius/harmony'

import {
  UserProfileListProps,
  UserProfilePictureList
} from 'components/user-profile-picture-list'

const messages = {
  viewAll: 'View All'
}

type ProfilePictureListTileProps = UserProfileListProps & {
  onClick: () => void
}

export const ProfilePictureListTile = ({
  onClick,
  users,
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
