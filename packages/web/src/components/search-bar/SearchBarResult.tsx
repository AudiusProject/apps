import { useCollection, useTrack, useUser } from '@audius/common/api'
import { ID, Kind, SquareSizes } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Text,
  Flex,
  Avatar,
  Artwork,
  IconCloseAlt,
  useTheme
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'

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
  id,
  isSelected
}: {
  children: React.ReactNode
  to: string
  onRemove?: () => void
  kind: Kind
  id: ID
  isSelected?: boolean
}) => {
  const dispatch = useDispatch()
  const { color } = useTheme()
  return (
    <Link
      to={to}
      data-search-result-value={id}
      onClick={() => {
        dispatch(addRecentSearch({ searchItem: { kind, id } }))
      }}
      css={{
        textDecoration: 'none',
        display: 'block',
        width: '100%'
      }}
    >
      <Flex
        alignItems='center'
        justifyContent='space-between'
        borderRadius='s'
        css={{
          minWidth: 0,
          width: '100%',
          minHeight: '56px',
          padding: '0 8px',
          border: '1px solid transparent',
          borderRadius: 's',
          backgroundColor: 'transparent',
          ...(isSelected
            ? {
                backgroundColor: color.background.surface2,
                border: `1px solid ${color.border.default}`
              }
            : {}),
          '&:hover': {
            backgroundColor: color.background.surface2,
            border: `1px solid ${color.border.default}`
          }
        }}
        gap='s'
      >
        {children}
        {onRemove ? (
          <IconCloseAlt
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()
              e.nativeEvent.stopImmediatePropagation()
              onRemove()
            }}
            onMouseDown={(e: React.MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            size='s'
            color='subdued'
            css={{
              flexShrink: 0,
              cursor: 'pointer',
              opacity: 0,
              transition: 'opacity 0.2s ease-in-out',
              pointerEvents: 'auto',
              '&:hover': {
                color: color.icon.default,
                opacity: 1
              }
            }}
          />
        ) : null}
      </Flex>
    </Link>
  )
}

type ResultTextProps = {
  primary: string
  secondary: string
  badges?: React.ReactNode
}

const ResultText = ({ primary, secondary, badges }: ResultTextProps) => (
  <Flex direction='column' flex={1} css={{ minWidth: 0, width: 0 }}>
    <Flex alignItems='center' gap='xs' css={{ minWidth: 0, width: '100%' }}>
      <Text
        variant='body'
        size='s'
        color='default'
        ellipses
        className={styles.primary}
      >
        {primary}
      </Text>
      {badges && (
        <Flex alignItems='center' gap='2xs' css={{ flexShrink: 0 }}>
          {badges}
        </Flex>
      )}
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
  isSelected?: boolean
}

export const UserResult = ({
  userId,
  onRemove,
  isSelected
}: UserResultProps) => {
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
      isSelected={isSelected}
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
        badges={<UserBadges userId={user.user_id} size='xs' inline />}
      />
    </ResultWrapper>
  )
}

type TrackResultProps = {
  trackId: ID
  onRemove?: () => void
  isSelected?: boolean
}

export const TrackResult = ({
  trackId,
  onRemove,
  isSelected
}: TrackResultProps) => {
  const { data: track } = useTrack(trackId)
  const { data: user } = useUser(track?.owner_id)
  const { imageUrl: trackArtwork } = useTrackCoverArt({
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
      isSelected={isSelected}
    >
      <Artwork h={30} w={30} src={trackArtwork} css={{ flexShrink: 0 }} />
      <ResultText primary={track.title} secondary={user.name} />
    </ResultWrapper>
  )
}

type CollectionResultProps = {
  collectionId: ID
  onRemove?: () => void
  isSelected?: boolean
}

export const CollectionResult = ({
  collectionId,
  onRemove,
  isSelected
}: CollectionResultProps) => {
  const { data: collection } = useCollection(collectionId)
  const { data: user } = useUser(
    collection ? collection.playlist_owner_id : null
  )
  const { imageUrl: collectionArtwork } = useCollectionCoverArt({
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
      isSelected={isSelected}
    >
      <Artwork h={30} w={30} src={collectionArtwork} css={{ flexShrink: 0 }} />
      <ResultText primary={collection.playlist_name} secondary={user.name} />
    </ResultWrapper>
  )
}
