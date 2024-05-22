import { SquareSizes, UserMetadata } from '@audius/common/models'
import { Flex, Text, useTheme } from '@audius/harmony'
import styled from '@emotion/styled'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useUserProfilePicture'

import styles from './AccountSwitcherRow.module.css'

export type AccountSwitcherRowProps = {
  user: UserMetadata
  isSelected?: boolean
}

const Indicator = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  width: theme.spacing.xs,
  backgroundColor: theme.color.background.accent
}))

export const AccountSwitcherRow = ({
  user,
  isSelected = false
}: AccountSwitcherRowProps) => {
  const profilePicture = useProfilePicture(
    user.user_id,
    SquareSizes.SIZE_150_BY_150
  )
  const { iconSizes, color } = useTheme()
  return (
    <Flex
      ph='xl'
      pv='l'
      gap='s'
      alignItems='center'
      justifyContent='flex-start'
      css={{
        ...(isSelected
          ? {
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '100%',
                backgroundColor: color.background.accent,
                opacity: 0.03
              }
            }
          : {
              '&:hover': {
                cursor: 'pointer',
                backgroundColor: color.background.surface2
              }
            })
      }}
    >
      {isSelected && <Indicator />}
      <DynamicImage
        wrapperClassName={styles.profilePictureWrapper}
        skeletonClassName={styles.profilePictureSkeleton}
        className={styles.profilePicture}
        image={profilePicture}
      />
      <Flex direction='column' gap='xs'>
        <Flex gap='xs' alignItems='center' justifyContent='flex-start'>
          <Text
            variant='title'
            size='m'
            color={isSelected ? 'accent' : 'default'}
          >
            {user.name}
          </Text>
          <UserBadges userId={user.user_id} badgeSize={iconSizes.xs} inline />
        </Flex>
        <Text
          variant='body'
          size='s'
          color={isSelected ? 'accent' : 'default'}
        >{`@${user.handle}`}</Text>
      </Flex>
    </Flex>
  )
}
