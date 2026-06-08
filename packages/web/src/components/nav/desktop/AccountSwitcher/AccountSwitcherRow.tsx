import { SquareSizes, UserMetadata } from '@audius/common/models'
import { Flex, Text, useTheme, Image } from '@audius/harmony'
import styled from '@emotion/styled'
import cn from 'classnames'

import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { backgroundOverlay } from 'utils/styleUtils'

import styles from './AccountSwitcherRow.module.css'

type AccountSwitcherRowProps = {
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
  const profilePicture = useProfilePicture({
    userId: user.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })
  const { color } = useTheme()
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
              ...backgroundOverlay({
                color: color.background.accent,
                opacity: 0.03
              })
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
      <Image
        className={cn(styles.profilePictureWrapper, styles.profilePicture)}
        src={profilePicture}
      />
      <Flex direction='column' gap='xs'>
        <Flex gap='xs' alignItems='center' justifyContent='flex-start'>
          <Text
            variant='title'
            size='m'
            css={{
              color: isSelected ? color.secondary.s500 : color.neutral.neutral
            }}
          >
            {user.name}
          </Text>
          <UserBadges userId={user.user_id} inline />
        </Flex>
        <Text
          variant='body'
          size='s'
          css={{
            color: isSelected ? color.secondary.s500 : color.neutral.neutral
          }}
        >{`@${user.handle}`}</Text>
      </Flex>
    </Flex>
  )
}
