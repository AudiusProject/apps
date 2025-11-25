import { IconSpeaker } from '@audius/harmony'

import { matchesRoute, useMatch } from 'utils/route'

type NavSpeakerIconProps = {
  playingFromRoute: string | null
  targetRoute: string
}

export const NavSpeakerIcon = ({
  playingFromRoute,
  targetRoute
}: NavSpeakerIconProps) => {
  const isSelected = useMatch(targetRoute)
  const isPlayingFromRoute = matchesRoute({
    current: playingFromRoute,
    target: targetRoute
  })

  if (!isPlayingFromRoute) return null

  return <IconSpeaker size='s' color={isSelected ? 'white' : 'accent'} />
}
