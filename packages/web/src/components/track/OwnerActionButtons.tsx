import { MouseEventHandler, ReactNode, useCallback } from 'react'

import { useCollection, useTrack } from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  usePublishConfirmationModal,
  trackPageActions
} from '@audius/common/store'
import {
  Flex,
  IconButton,
  IconPencil,
  IconRocket,
  IconShare,
  Tooltip
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { push } from 'utils/navigation'

const { makeTrackPublic } = trackPageActions

const messages = {
  share: 'Share',
  edit: 'Edit Track',
  publish: 'Make Public'
}

type OwnerActionButtonProps = {
  contentId: ID // Collection or Track ID
  isDisabled?: boolean
  isLoading?: boolean
  rightActions?: ReactNode
  bottomBar?: ReactNode
  isDarkMode?: boolean
  isMatrixMode: boolean
  showIconButtons?: boolean
  onClickShare: MouseEventHandler<HTMLButtonElement>
}

type EntityDetails = {
  isUnlisted: boolean
  permalink?: string
}

export const OwnerActionButtons = ({
  contentType,
  ...rest
}: OwnerActionButtonProps & { contentType: 'track' | 'collection' }) => {
  return contentType === 'track' ? (
    <TrackOwnerActionButtons {...rest} />
  ) : (
    <CollectionOwnerActionButtons {...rest} />
  )
}

const TrackOwnerActionButtons = ({
  contentId,
  ...rest
}: OwnerActionButtonProps) => {
  const { data: partialTrack } = useTrack(contentId, {
    select: (track) => ({
      isUnlisted: track?.is_unlisted ?? false,
      permalink: track?.permalink
    })
  })
  const { isUnlisted = false, permalink } = partialTrack ?? {}
  return (
    <BaseOwnerActionButtons
      isUnlisted={isUnlisted}
      permalink={permalink}
      contentId={contentId}
      {...rest}
    />
  )
}

const CollectionOwnerActionButtons = ({
  contentId,
  ...rest
}: OwnerActionButtonProps) => {
  const { data: partialCollection } = useCollection(contentId, {
    select: (collection) => ({
      isUnlisted: collection?.is_private ?? false,
      permalink: collection?.permalink
    })
  })
  const { isUnlisted = false, permalink } = partialCollection ?? {}
  return (
    <BaseOwnerActionButtons
      isUnlisted={isUnlisted}
      permalink={permalink}
      contentId={contentId}
      {...rest}
    />
  )
}

const BaseOwnerActionButtons = ({
  isUnlisted,
  permalink,
  contentId,
  isDisabled,
  isLoading,
  rightActions,
  bottomBar,
  showIconButtons,
  onClickShare
}: OwnerActionButtonProps & EntityDetails) => {
  const dispatch = useDispatch()

  const onStopPropagation = useCallback((e: any) => e.stopPropagation(), [])
  const { onOpen: openPublishConfirmation } = usePublishConfirmationModal()

  const handleEdit = useCallback(() => {
    dispatch(push(`${permalink}/edit`))
  }, [permalink, dispatch])

  const handlePublishClick = useCallback(() => {
    openPublishConfirmation({
      contentType: 'track',
      confirmCallback: () => {
        dispatch(makeTrackPublic(contentId))
      }
    })
  }, [contentId, dispatch, openPublishConfirmation])

  return (
    <Flex justifyContent='space-between' w='100%' alignItems='center'>
      {bottomBar}
      {!isLoading && showIconButtons ? (
        <Flex gap='2xl'>
          <Tooltip
            text={messages.share}
            disabled={isDisabled}
            placement='top'
            mount='page'
          >
            <Flex css={{ position: 'relative' }} onClick={onStopPropagation}>
              <IconButton
                size='m'
                icon={IconShare}
                onClick={onClickShare}
                aria-label={messages.share}
                color='subdued'
              />
            </Flex>
          </Tooltip>
          <Tooltip
            text={messages.edit}
            disabled={isDisabled}
            placement='top'
            mount='page'
          >
            <Flex css={{ position: 'relative' }} onClick={onStopPropagation}>
              <IconButton
                size='m'
                icon={IconPencil}
                onClick={handleEdit}
                aria-label={messages.edit}
                color='subdued'
              />
            </Flex>
          </Tooltip>
          {isUnlisted ? (
            <Tooltip
              text={messages.publish}
              disabled={isDisabled}
              placement='top'
              mount='page'
            >
              <Flex css={{ position: 'relative' }} onClick={onStopPropagation}>
                <IconButton
                  size='m'
                  icon={IconRocket}
                  aria-label='Publish Collection'
                  color='subdued'
                  disabled={isDisabled}
                  onClick={handlePublishClick}
                />
              </Flex>
            </Tooltip>
          ) : null}
        </Flex>
      ) : null}
      {!isLoading ? <Flex>{rightActions}</Flex> : null}
    </Flex>
  )
}
