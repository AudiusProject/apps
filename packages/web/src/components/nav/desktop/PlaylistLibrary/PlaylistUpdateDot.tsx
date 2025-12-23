import { Tooltip } from '@audius/harmony'

import { UpdateDot } from 'components/update-dot'

const messages = { recentlyUpdatedTooltip: 'Recently Updated' }

export const PlaylistUpdateDot = () => {
  return (
    <Tooltip
      mouseEnterDelay={0.1}
      text={messages.recentlyUpdatedTooltip}
      placement='right'
    >
      <UpdateDot />
    </Tooltip>
  )
}
