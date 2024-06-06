import { useCallback, MouseEvent } from 'react'

import { ID, SquareSizes } from '@audius/common/models'
import { cacheUsersSelectors } from '@audius/common/store'
import { formatCount } from '@audius/common/utils'
import { Box, Skeleton, Text } from '@audius/harmony'
import { useLinkClickHandler } from 'react-router-dom-v5-compat'

import { Avatar } from 'components/avatar'
import { Card, CardProps, CardFooter, CardContent } from 'components/card'
import { UserLink } from 'components/link'
import { useSelector } from 'utils/reducer'
import { profilePage } from 'utils/route'

const { getUser } = cacheUsersSelectors

const messages = {
  followers: (count: number) => (count === 1 ? 'Follower' : 'Followers')
}

const avatarSizeMap = {
  xs: SquareSizes.SIZE_150_BY_150,
  s: SquareSizes.SIZE_150_BY_150,
  m: SquareSizes.SIZE_480_BY_480,
  l: SquareSizes.SIZE_480_BY_480
}

export type UserCardProps = Omit<CardProps, 'id'> & {
  id: ID
  loading?: boolean
}

export const UserCard = (props: UserCardProps) => {
  const { id, loading, size, onClick, ...other } = props

  const user = useSelector((state) => getUser(state, { id }))

  const handleNavigate = useLinkClickHandler<HTMLDivElement>(
    profilePage(user?.handle ?? '')
  )

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      onClick?.(e)
      handleNavigate(e)
    },
    [onClick, handleNavigate]
  )

  if (!user || loading) {
    return (
      <Card size={size} {...other}>
        <Box p='l' pb='s'>
          <Skeleton
            border='default'
            borderRadius='circle'
            css={{ aspectRatio: 1 }}
          />
        </Box>
        <CardContent p='s' pt={0} gap='xs'>
          <Skeleton h={22} w='80%' alignSelf='center' />
          <Skeleton h={16} w='50%' mv='xs' alignSelf='center' />
        </CardContent>
        <CardFooter>
          <Skeleton h={20} w='60%' alignSelf='center' />
        </CardFooter>
      </Card>
    )
  }

  const { handle, follower_count } = user

  return (
    <Card size={size} onClick={handleClick} {...other}>
      <Avatar
        userId={id}
        aria-hidden
        p='l'
        pb='s'
        imageSize={avatarSizeMap[size]}
      />
      <CardContent p='s' pt={0} gap='xs'>
        <UserLink
          userId={id}
          textVariant='title'
          size='l'
          css={{ justifyContent: 'center' }}
        />
        <Text variant='body' ellipses>
          @{handle}
        </Text>
      </CardContent>
      <CardFooter>
        <Text variant='body' size='s' strength='strong'>
          {formatCount(follower_count)} {messages.followers(follower_count)}
        </Text>
      </CardFooter>
    </Card>
  )
}
