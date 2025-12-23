import { useCallback } from 'react'

import { ShareSource, ID } from '@audius/common/models'
import { shareModalUIActions } from '@audius/common/store'
import {
  IconShare,
  IconButton,
  IconButtonProps,
  Tooltip
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

const { requestOpen: requestOpenShareModal } = shareModalUIActions

const messages = {
  share: 'Share'
}

type ShareButtonProps = Partial<IconButtonProps> & {
  collectionId: ID
  tooltipText?: string
}

export const ShareButton = (props: ShareButtonProps) => {
  const { collectionId, tooltipText, ...other } = props
  const dispatch = useDispatch()

  const handleShare = useCallback(() => {
    dispatch(
      requestOpenShareModal({
        type: 'collection',
        collectionId,
        source: ShareSource.PAGE
      })
    )
  }, [dispatch, collectionId])

  const buttonRender = (
    <IconButton
      icon={IconShare}
      onClick={handleShare}
      size='2xl'
      color='subdued'
      aria-label={messages.share}
      {...other}
    />
  )

  return (
    <Tooltip text={tooltipText ?? messages.share}>
      <span>{buttonRender}</span>
    </Tooltip>
  )
}
