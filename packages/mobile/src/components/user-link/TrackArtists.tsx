import type { ComponentProps } from 'react'
import { Fragment } from 'react'

import type { ID } from '@audius/common/models'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'

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

type TrackArtistsProps = Omit<ComponentProps<typeof UserLink>, 'style'> & {
  /** Accepted collaborator artists embedded on the track. */
  collaborators?: Collaborator[] | null
  style?: StyleProp<ViewStyle>
}

/**
 * A track's artist line for mobile: the owner `<UserLink>` plus accepted
 * collaborators. With the flag off (or no collaborators) it renders just the
 * owner — a safe drop-in for an existing owner `<UserLink>`.
 */
export const TrackArtists = ({
  collaborators,
  style,
  ...userLinkProps
}: TrackArtistsProps) => {
  return (
    <Flex
      row
      alignItems='center'
      justifyContent='center'
      w='100%'
      style={[styles.artistRow, style]}
    >
      <UserLink {...userLinkProps} style={styles.artistLink} />
      <CollaboratorLinks collaborators={collaborators} {...userLinkProps} />
    </Flex>
  )
}

const styles = StyleSheet.create({
  artistRow: {
    flexShrink: 1,
    overflow: 'hidden'
  },
  artistLink: {
    flexShrink: 1,
    minWidth: 0
  }
})
