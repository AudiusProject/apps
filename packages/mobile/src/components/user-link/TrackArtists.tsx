import { ComponentProps, Fragment } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'

import type { IconSize } from '@audius/harmony-native'
import { Flex, Text } from '@audius/harmony-native'

import { UserLink } from './UserLink'

type Collaborator = { user_id: ID }

type CollaboratorLinksProps = {
  collaborators?: Collaborator[] | null
  badgeSize?: IconSize
}

/**
 * Renders accepted collaborators as comma-separated `", <UserLink>"` entries.
 * Returns null when the collaborative-tracks flag is off or there are none, so
 * it's a no-op append to an existing owner element.
 */
export const CollaboratorLinks = ({
  collaborators,
  badgeSize
}: CollaboratorLinksProps) => {
  const { isEnabled } = useFeatureFlag(FeatureFlags.COLLABORATIVE_TRACKS)
  if (!isEnabled || !collaborators?.length) {
    return null
  }
  return (
    <>
      {collaborators.map((collaborator) => (
        <Fragment key={collaborator.user_id}>
          <Text color='subdued'>, </Text>
          <UserLink userId={collaborator.user_id} badgeSize={badgeSize} />
        </Fragment>
      ))}
    </>
  )
}

type TrackArtistsProps = ComponentProps<typeof UserLink> & {
  /** Accepted collaborator artists embedded on the track. */
  collaborators?: Collaborator[] | null
}

/**
 * A track's artist line for mobile: the owner `<UserLink>` plus accepted
 * collaborators. With the flag off (or no collaborators) it renders just the
 * owner — a safe drop-in for an existing owner `<UserLink>`.
 */
export const TrackArtists = ({
  collaborators,
  ...userLinkProps
}: TrackArtistsProps) => {
  return (
    <Flex
      row
      alignItems='center'
      justifyContent='center'
      style={{ flexShrink: 1 }}
    >
      <UserLink {...userLinkProps} />
      <CollaboratorLinks
        collaborators={collaborators}
        badgeSize={userLinkProps.badgeSize}
      />
    </Flex>
  )
}
