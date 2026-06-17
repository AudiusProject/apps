import type { ComponentProps } from 'react'
import { Fragment, useMemo } from 'react'

import { useUsers } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import { Flex, Text, TextLink } from '@audius/harmony-native'

import { UserBadges } from '../user-badges'

import { UserLink } from './UserLink'

type Collaborator = { user_id: ID }

type CollaboratorLinksProps = Omit<
  ComponentProps<typeof UserLink>,
  'userId'
> & {
  collaborators?: Collaborator[] | null
}

/**
 * Renders accepted collaborators as comma-separated `", <UserLink>"` entries.
 * Returns null when there are none, so it's a no-op append to an owner element.
 */
export const CollaboratorLinks = ({
  collaborators,
  ...userLinkProps
}: CollaboratorLinksProps) => {
  if (!collaborators?.length) {
    return null
  }
  return (
    <>
      {collaborators.map((collaborator) => (
        <Fragment key={collaborator.user_id}>
          <Text color='subdued'>, </Text>
          <UserLink
            {...userLinkProps}
            userId={collaborator.user_id}
            style={styles.artistLink}
          />
        </Fragment>
      ))}
    </>
  )
}

type TrackArtistsProps = Omit<
  ComponentProps<typeof UserLink>,
  'style' | 'hideBadges'
> & {
  /** Accepted collaborator artists embedded on the track. */
  collaborators?: Collaborator[] | null
  style?: StyleProp<ViewStyle>
}

/**
 * A track's centered artist line for mobile: the owner `<UserLink>` plus
 * accepted collaborators, each followed by their own user badges.
 */
export const TrackArtists = ({
  collaborators,
  style,
  ...userLinkProps
}: TrackArtistsProps) => {
  const {
    userId,
    badgeSize,
    hideFanClubBadge,
    mint,
    textLinkStyle,
    ...textLinkProps
  } = userLinkProps
  const artistIds = useMemo(
    () => [
      userId,
      ...(collaborators?.map((collaborator) => collaborator.user_id) ?? [])
    ],
    [userId, collaborators]
  )
  const { byId: usersById } = useUsers(artistIds)
  const artists = artistIds
    .map((artistId) => ({
      userId: artistId,
      name: usersById[artistId]?.name
    }))
    .filter((artist) => artist.name)

  return (
    <Flex alignItems='center' w='100%' style={[styles.artistColumn, style]}>
      <Flex
        row
        alignItems='center'
        justifyContent='center'
        w='100%'
        style={styles.artistLine}
      >
        {artists.map((artist, index) => (
          <Fragment key={artist.userId}>
            {index > 0 ? <Text color='subdued'>, </Text> : null}
            <Flex
              row
              alignItems='center'
              gap='xs'
              style={styles.artistGroup}
              testID={`track-artist-${artist.userId}`}
            >
              <TextLink
                {...textLinkProps}
                to={{ screen: 'Profile', params: { id: artist.userId } }}
                numberOfLines={1}
                style={[styles.artistName, textLinkStyle]}
              >
                {artist.name}
              </TextLink>
              <UserBadges
                userId={artist.userId}
                badgeSize={badgeSize}
                mint={artist.userId === userId ? mint : undefined}
                hideFanClubBadge={hideFanClubBadge}
              />
            </Flex>
          </Fragment>
        ))}
      </Flex>
    </Flex>
  )
}

const styles = StyleSheet.create({
  artistColumn: {
    flexShrink: 1,
    overflow: 'hidden'
  },
  artistLine: {
    minWidth: 0,
    overflow: 'hidden'
  },
  artistGroup: {
    flexShrink: 1,
    minWidth: 0
  },
  artistName: {
    flexShrink: 1,
    minWidth: 0
  },
  artistLink: {
    flexShrink: 1,
    minWidth: 0
  }
})
