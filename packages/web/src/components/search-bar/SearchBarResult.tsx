import { useCollection, useTrack, useUser } from '@audius/common/api'
import { ID, Kind, SquareSizes } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Text, Flex, Avatar, Artwork, IconCloseAlt } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'

import UserBadges from 'components/user-badges/UserBadges'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

import styles from './DesktopSearchBar.module.css'

const { profilePage, collectionPage } = route
const { addItem: addRecentSearch } = searchActions

const ResultWrapper = ({
  children,
  to,
  onRemove,
  kind,
  id
}: {
  children: React.ReactNode
  to: string
  onRemove?: () => void
  kind: Kind
  id: ID
}) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      p='s'
      css={{
        minWidth: 0
      }}
      as={Link}
      gap='s'
      onClick={() => {
        dispatch(addRecentSearch({ searchItem: { kind, id } }))
        navigate(to)
      }}
    >
      {children}
      {onRemove ? (
        <IconCloseAlt
          onClick={onRemove}
          size='s'
          color='subdued'
          className={styles.removeIcon}
        />
      ) : null}
    </Flex>
  )
}

type ResultTextProps = {
  primary: string
  secondary: string
  badges?: React.ReactNode
}

const ResultText = ({ primary, secondary, badges }: ResultTextProps) => (
  <Flex direction='column' flex={1} css={{ minWidth: 0, maxWidth: '100%' }}>
    <Flex alignItems='center' gap='2xs' css={{ minWidth: 0 }}>
      <Text
        variant='body'
        size='s'
        color='default'
        css={{ minWidth: 0 }}
        ellipses
        className={styles.primary}
      >
        {primary}
      </Text>
      {badges}
    </Flex>
    <Text
      variant='body'
      size='xs'
      color='subdued'
      css={{ minWidth: 0 }}
      ellipses
      className={styles.secondary}
    >
      {secondary}
    </Text>
  </Flex>
)

type UserResultProps = {
  userId: ID
  onRemove?: () => void
}

export const UserResult = ({ userId, onRemove }: UserResultProps) => {
  const { data: user } = useUser(userId)
  const profilePicture = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })
  if (!user) return null
  return (
    <ResultWrapper
      to={profilePage(user.handle)}
      onRemove={onRemove}
      kind={Kind.USERS}
      id={userId}
    >
      <Avatar
        h={30}
        w={30}
        src={profilePicture}
        borderWidth='thin'
        css={{ flexShrink: 0 }}
      />
      <ResultText
        primary={user.name}
        secondary={`@${user.handle}`}
        badges={<UserBadges userId={user.user_id} size='s' inline />}
      />
    </ResultWrapper>
  )
}

type TrackResultProps = {
  trackId: ID
  onRemove?: () => void
}

export const TrackResult = ({ trackId, onRemove }: TrackResultProps) => {
  const { data: track } = useTrack(trackId)
  const { data: user } = useUser(track?.owner_id)
  const trackArtwork = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })

  if (!track || !user) return null

  return (
    <ResultWrapper
      to={track.permalink}
      onRemove={onRemove}
      kind={Kind.TRACKS}
      id={trackId}
    >
      <Artwork h={30} w={30} src={trackArtwork} css={{ flexShrink: 0 }} />
      <ResultText primary={track.title} secondary={user.name} />
    </ResultWrapper>
  )
}

type CollectionResultProps = {
  collectionId: ID
  onRemove?: () => void
}

export const CollectionResult = ({
  collectionId,
  onRemove
}: CollectionResultProps) => {
  const { data: collection } = useCollection(collectionId)
  const { data: user } = useUser(
    collection ? collection.playlist_owner_id : null
  )
  const collectionArtwork = useCollectionCoverArt({
    collectionId,
    size: SquareSizes.SIZE_150_BY_150
  })
  if (!collection || !user) return null
  return (
    <ResultWrapper
      to={collectionPage(
        user.handle,
        collection.playlist_name,
        collection.playlist_id,
        collection.permalink,
        collection.is_album
      )}
      onRemove={onRemove}
      kind={Kind.COLLECTIONS}
      id={collectionId}
    >
      <Artwork h={30} w={30} src={collectionArtwork} css={{ flexShrink: 0 }} />
      <ResultText primary={collection.playlist_name} secondary={user.name} />
    </ResultWrapper>
  )
}
