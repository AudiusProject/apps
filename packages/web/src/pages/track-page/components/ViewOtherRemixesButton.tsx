import { useTrack } from '@audius/common/api'
import { trackPageMessages as messages } from '@audius/common/messages'
import { ID } from '@audius/common/models'
import { Button, ButtonProps, IconArrowRight } from '@audius/harmony'
import { Link } from 'react-router'

import { trackRemixesPage } from 'utils/route'

type ViewOtherRemixesButtonProps = {
  parentTrackId: ID
} & ButtonProps

export const ViewOtherRemixesButton = (props: ViewOtherRemixesButtonProps) => {
  const { parentTrackId, ...buttonProps } = props

  const { data: permalink } = useTrack(parentTrackId, {
    select: (track) => track.permalink
  })

  const remixesRoute = trackRemixesPage(permalink ?? '')

  return (
    <Button iconRight={IconArrowRight} asChild {...buttonProps}>
      <Link to={remixesRoute}>{messages.viewOtherRemixes}</Link>
    </Button>
  )
}
