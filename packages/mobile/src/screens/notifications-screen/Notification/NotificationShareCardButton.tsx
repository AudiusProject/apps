import { useCallback } from 'react'

import { ShareSource } from '@audius/common/models'
import type { ID } from '@audius/common/models'
import type { ShareMilestoneStat } from '@audius/common/store'
import { shareModalUIActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Button, IconShare } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

const messages = {
  share: 'Share'
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    marginTop: spacing(4),
    alignSelf: 'flex-start'
  }
}))

type NotificationShareCardButtonProps = {
  trackId: ID
  stat: ShareMilestoneStat
}

/** Opens the share drawer with a stat card for a track milestone */
export const NotificationShareCardButton = ({
  trackId,
  stat
}: NotificationShareCardButtonProps) => {
  const styles = useStyles()
  const dispatch = useDispatch()

  const handlePress = useCallback(() => {
    dispatch(
      shareModalUIActions.requestOpen({
        type: 'milestone',
        trackId,
        stat,
        source: ShareSource.NOTIFICATION
      })
    )
  }, [dispatch, trackId, stat])

  return (
    <Button
      variant='secondary'
      size='small'
      iconLeft={IconShare}
      onPress={handlePress}
      style={styles.root}
    >
      {messages.share}
    </Button>
  )
}
