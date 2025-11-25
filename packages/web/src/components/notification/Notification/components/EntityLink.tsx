import { MouseEventHandler, useCallback } from 'react'

import {
  Name,
  User,
  TrackMetadata,
  CollectionMetadata
} from '@audius/common/models'
import { Entity, useNotificationModal } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import { OptionalId } from '@audius/sdk'
import { useNavigate } from 'react-router-dom'

import { make, useRecord } from 'common/store/analytics/actions'

import { getEntityLink } from '../utils'

import styles from './EntityLink.module.css'

type EntityType = (CollectionMetadata | TrackMetadata) & {
  user: Nullable<User>
}

type EntityLinkProps = {
  entity: EntityType
  entityType: Entity
}

export const useGoToEntity = (
  entity: Nullable<EntityType>,
  entityType: Entity,
  goToComments?: boolean,
  commentId?: number
) => {
  const navigate = useNavigate()
  const record = useRecord()
  const { onClose } = useNotificationModal()

  const handleClick: MouseEventHandler = useCallback(
    (event) => {
      if (!entity) return
      event.stopPropagation()
      event.preventDefault()
      const link = getEntityLink(entity)
      const urlParams = new URLSearchParams()
      if (commentId) {
        const parsedCommentId = OptionalId.parse(commentId)
        if (parsedCommentId) {
          urlParams.set('commentId', parsedCommentId)
        }
      } else if (goToComments) {
        urlParams.set('showComments', 'true')
      }
      const newLink = `${link}?${urlParams.toString()}`

      onClose()
      navigate(newLink)
      record(
        make(Name.NOTIFICATIONS_CLICK_TILE, {
          kind: entityType,
          link_to: link
        })
      )
    },
    [commentId, navigate, entity, entityType, goToComments, onClose, record]
  )
  return handleClick
}

export const EntityLink = (props: EntityLinkProps) => {
  const { entity, entityType } = props
  const title = entity
    ? 'playlist_id' in entity
      ? entity.playlist_name
      : entity.title
    : ''

  const handleClick = useGoToEntity(entity, entityType)

  return (
    <a className={styles.link} onClick={handleClick}>
      {title}
    </a>
  )
}
