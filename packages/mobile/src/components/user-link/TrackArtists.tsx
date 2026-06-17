import type { ComponentProps } from 'react'
import { Fragment } from 'react'

import type { ID } from '@audius/common/models'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'

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
 * accepted collaborators. User badges render on their own centered row so the
 * names stay visually centered under the title.
 */
export const TrackArtists = ({
  collaborators,
  style,
  ...userLinkProps
}: TrackArtistsProps) => {
  return (
    <Flex alignItems='center' w='100%' style={[styles.artistColumn, style]}>
      <Flex row alignItems='center' justifyContent='center' w='100%'>
        <UserLink {...userLinkProps} hideBadges style={styles.artistLink} />
        <CollaboratorLinks
          collaborators={collaborators}
          {...userLinkProps}
          hideBadges
        />
      </Flex>
      <Flex
        row
        alignItems='center'
        justifyContent='center'
        style={styles.badges}
      >
        <UserBadges
          userId={userLinkProps.userId}
          badgeSize={userLinkProps.badgeSize}
          hideFanClubBadge={userLinkProps.hideFanClubBadge}
        />
        {collaborators?.map((collaborator) => (
          <UserBadges
            key={collaborator.user_id}
            userId={collaborator.user_id}
            badgeSize={userLinkProps.badgeSize}
            hideFanClubBadge={userLinkProps.hideFanClubBadge}
          />
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
  badges: {
    gap: 4
  },
  artistLink: {
    flexShrink: 1,
    minWidth: 0
  }
})
