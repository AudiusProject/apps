import { ComponentProps, Fragment } from 'react'

import { ID } from '@audius/common/models'
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
 * With no collaborators this is equivalent to a single owner `<UserLink>` —
 * a safe drop-in replacement everywhere the owner is currently shown.
 */
export const TrackArtists = ({
  userId,
  collaborators,
  ...userLinkProps
}: TrackArtistsProps) => {
  const seenUserIds = new Set<ID>([userId])
  const extraArtists = (collaborators ?? []).filter((collaborator) => {
    if (seenUserIds.has(collaborator.user_id)) {
      return false
    }
    seenUserIds.add(collaborator.user_id)
    return true
  })

  if (extraArtists.length === 0) {
    return <UserLink userId={userId} {...userLinkProps} />
  }

  return (
    <Flex
      alignItems='center'
      css={{
        minWidth: 0,
        maxWidth: '100%',
        overflow: userLinkProps.popover ? 'visible' : 'hidden',
        display: 'inline-flex'
      }}
    >
      <UserLink
        userId={userId}
        ellipses
        {...userLinkProps}
        noOverflow={userLinkProps.noOverflow || userLinkProps.popover}
      />
      {extraArtists.map((collaborator) => (
        <Fragment key={collaborator.user_id}>
          <Text color='subdued' css={{ marginRight: 4 }}>
            ,
          </Text>
          <UserLink
            userId={collaborator.user_id}
            ellipses
            {...userLinkProps}
            noOverflow={userLinkProps.noOverflow || userLinkProps.popover}
          />
        </Fragment>
      ))}
    </Flex>
  )
}
