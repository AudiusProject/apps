import { ComponentProps, Fragment } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { Flex, Text } from '@audius/harmony'

import { UserLink } from './UserLink'

type TrackArtistsProps = {
  /** The track owner. */
  userId: ID
  /** Accepted collaborator artists, as embedded on the track. */
  collaborators?: { user_id: ID }[] | null
} & Omit<ComponentProps<typeof UserLink>, 'userId'>

/**
 * A track's artist line: the owner plus accepted collaborators as a
 * comma-separated list on a single line that ellipsizes on overflow.
 *
 * Collaborators render only when the `COLLABORATIVE_TRACKS` flag is enabled, so
 * with the flag off this is equivalent to a single owner `<UserLink>` — making
 * it a safe drop-in replacement everywhere the owner is currently shown.
 */
export const TrackArtists = ({
  userId,
  collaborators,
  ...userLinkProps
}: TrackArtistsProps) => {
  const { isEnabled } = useFeatureFlag(FeatureFlags.COLLABORATIVE_TRACKS)
  const extraArtists = isEnabled ? (collaborators ?? []) : []

  if (extraArtists.length === 0) {
    return <UserLink userId={userId} {...userLinkProps} />
  }

  return (
    <Flex
      alignItems='center'
      css={{ minWidth: 0, overflow: 'hidden', display: 'inline-flex' }}
    >
      <UserLink userId={userId} ellipses {...userLinkProps} />
      {extraArtists.map((collaborator) => (
        <Fragment key={collaborator.user_id}>
          <Text color='subdued' css={{ marginRight: 4 }}>
            ,
          </Text>
          <UserLink userId={collaborator.user_id} ellipses {...userLinkProps} />
        </Fragment>
      ))}
    </Flex>
  )
}
