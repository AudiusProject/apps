import { useCallback, useEffect } from 'react'

import { useUser } from '@audius/common/api'
import { imageBlank as placeholderArt } from '@audius/common/assets'
import { SquareSizes, ID } from '@audius/common/models'
import { formatCount, route } from '@audius/common/utils'
import cn from 'classnames'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import PerspectiveCard from 'components/perspective-card/PerspectiveCard'
import UserBadges from 'components/user-badges/UserBadges'
import { useProfilePicture } from 'hooks/useProfilePicture'
import {
  setUsers,
  setVisibility
} from 'store/application/ui/userListModal/slice'
import {
  UserListType,
  UserListEntityType
} from 'store/application/ui/userListModal/types'
import { AppState } from 'store/types'
import { push } from 'utils/navigation'
import { withNullGuard } from 'utils/withNullGuard'

import styles from './UserArtCard.module.css'

const { profilePage } = route

const messages = {
  followers: (count: number) => `${formatCount(count)} Followers`
}

type OwnProps = {
  className?: string
  id: ID
  index: number
  isLoading?: boolean
  setDidLoad?: (index: number) => void
}

type UserArtCardProps = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const g = withNullGuard((props: UserArtCardProps) => {
  const { data: user } = useUser(props.id)
  if (user) return { ...props, user }
})

const UserArtCard = g(
  ({
    className,
    index,
    isLoading,
    setDidLoad,
    user,
    setFollowerUser,
    setModalVisibility,
    goToRoute
  }) => {
    const { user_id, name, handle, follower_count } = user

    const goToProfile = useCallback(() => {
      const link = profilePage(handle)
      goToRoute(link)
    }, [handle, goToRoute])

    const onClickFollowers = useCallback(() => {
      setFollowerUser(user_id)
      setModalVisibility()
    }, [setFollowerUser, setModalVisibility, user_id])

    const image = useProfilePicture({
      userId: user_id,
      size: SquareSizes.SIZE_480_BY_480,
      defaultImage: placeholderArt
    })

    useEffect(() => {
      if (image && setDidLoad) setDidLoad(index)
    }, [image, setDidLoad, index])

    return (
      <div className={cn(styles.card, className)}>
        <PerspectiveCard
          onClick={goToProfile}
          className={styles.perspectiveCard}
        >
          <DynamicImage
            wrapperClassName={styles.profilePicture}
            image={isLoading ? '' : image}
          />
        </PerspectiveCard>
        <div className={styles.userName} onClick={goToProfile}>
          <span>{name}</span>
          <UserBadges
            userId={user_id}
            size='s'
            className={styles.iconVerified}
          />
        </div>
        <div className={styles.followerCount} onClick={onClickFollowers}>
          {messages.followers(follower_count)}
        </div>
      </div>
    )
  }
)

function mapStateToProps(state: AppState, ownProps: OwnProps) {
  return {}
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    setFollowerUser: (userID: ID) =>
      dispatch(
        setUsers({
          userListType: UserListType.FOLLOWER,
          entityType: UserListEntityType.USER,
          id: userID
        })
      ),
    setModalVisibility: () => dispatch(setVisibility(true)),
    goToRoute: (route: string) => dispatch(push(route))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(UserArtCard)
