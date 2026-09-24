import {
  EntityManagerAction,
  GetTrackCommentsSortMethodEnum as CommentSortMethod,
  CommentMention
} from '@audius/sdk'

import { ID } from '~/models/Identifiers'

import {
  usePostComment as useTqPostComment,
  useReactToComment as useTqReactToComment,
  useEditComment as useTqEditComment,
  useDeleteComment as useTqDeleteComment,
  usePinComment as useTqPinComment,
  useReportComment as useTqReportComment,
  useMuteUser as useTqMuteUser,
  useUpdateTrackCommentNotificationSetting as useTqUpdateTrackCommentNotificationSetting,
  useUpdateCommentNotificationSetting as useTqUpdateCommentNotificationSetting,
  useGetTrackCommentNotificationSetting as useTqGetTrackCommentNotificationSetting,
  useCurrentUserId
} from '../../api'

import { useCurrentCommentSection } from './commentsContext'

export const usePostComment = () => {
  const { currentUserId, entityId, entityType, currentSort } =
    useCurrentCommentSection()
  const { mutate: postComment, ...rest } = useTqPostComment()

  const wrappedHandler = async (
    message: string,
    parentCommentId?: ID,
    trackTimestampS?: number,
    mentions?: CommentMention[]
  ) => {
    if (currentUserId) {
      postComment({
        userId: currentUserId,
        trackId: entityId,
        entityType,
        body: message,
        parentCommentId,
        trackTimestampS,
        mentions,
        currentSort
      })
    }
  }

  return [wrappedHandler, rest] as const
}

export const useReactToComment = () => {
  const { currentUserId, isEntityOwner, currentSort, entityId } =
    useCurrentCommentSection()
  const { mutate: reactToComment, ...response } = useTqReactToComment()

  const wrappedHandler = async (commentId: ID, isLiked: boolean) => {
    if (currentUserId) {
      reactToComment({
        commentId,
        userId: currentUserId,
        isLiked,
        isEntityOwner,
        currentSort,
        trackId: entityId
      })
    }
  }
  return [wrappedHandler, response] as const
}

export const useEditComment = () => {
  const { currentUserId, currentSort, entityId } = useCurrentCommentSection()
  const { mutate: editComment, ...rest } = useTqEditComment()

  const wrappedHandler = async (
    commentId: ID,
    newMessage: string,
    mentions?: CommentMention[]
  ) => {
    if (currentUserId) {
      editComment({
        commentId,
        newMessage,
        userId: currentUserId,
        mentions,
        trackId: entityId,
        currentSort
      })
    }
  }
  return [wrappedHandler, rest] as const
}

export const usePinComment = () => {
  const {
    currentUserId,
    entityId,
    currentSort,
    track: trackData
  } = useCurrentCommentSection()
  const { mutate: pinComment, ...rest } = useTqPinComment()

  const wrappedHandler = (commentId: ID, isPinned: boolean) => {
    if (currentUserId) {
      pinComment({
        commentId,
        userId: currentUserId,
        trackId: entityId,
        isPinned,
        currentSort,
        previousPinnedCommentId: trackData?.pinned_comment_id
      })
    }
  }
  return [wrappedHandler, rest] as const
}

export const useReportComment = () => {
  const { currentUserId, entityId, currentSort } = useCurrentCommentSection()
  const { mutate: reportComment, ...rest } = useTqReportComment()

  const wrappedHandler = (commentId: ID, parentCommentId?: ID) => {
    if (currentUserId) {
      reportComment({
        commentId,
        parentCommentId,
        userId: currentUserId,
        trackId: entityId,
        currentSort
      })
    }
  }
  return [wrappedHandler, rest] as const
}

export const useMuteUser = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { mutate: muteUser, ...rest } = useTqMuteUser()

  const wrappedHandler = ({
    mutedUserId,
    isMuted,
    trackId,
    currentSort
  }: {
    mutedUserId: number
    isMuted: boolean
    trackId?: ID
    currentSort?: CommentSortMethod
  }) => {
    if (currentUserId) {
      muteUser({
        mutedUserId,
        userId: currentUserId,
        isMuted,
        trackId,
        currentSort
      })
    }
  }
  return [wrappedHandler, rest] as const
}

export const useDeleteComment = () => {
  const { currentUserId, entityId, currentSort } = useCurrentCommentSection()
  const { mutate: deleteComment, ...rest } = useTqDeleteComment()

  const wrappedHandler = (commentId: ID, parentCommentId?: ID) => {
    if (currentUserId) {
      deleteComment({
        commentId,
        userId: currentUserId,
        trackId: entityId,
        currentSort,
        parentCommentId
      })
    }
  }
  return [wrappedHandler, rest] as const
}

export const useGetTrackCommentNotificationSetting = (trackId: ID) => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: isMutedData } = useTqGetTrackCommentNotificationSetting(
    trackId,
    currentUserId
  )
  return isMutedData?.data?.isMuted
}

export const useUpdateTrackCommentNotificationSetting = (trackId: ID) => {
  const { data: currentUserId } = useCurrentUserId()
  const { mutate: updateSetting, ...rest } =
    useTqUpdateTrackCommentNotificationSetting()

  const wrappedHandler = (action: 'mute' | 'unmute') => {
    if (currentUserId) {
      updateSetting({
        userId: currentUserId,
        trackId,
        action:
          action === 'mute'
            ? EntityManagerAction.MUTE
            : EntityManagerAction.UNMUTE
      })
    }
  }

  return [wrappedHandler, rest] as const
}

export const useUpdateCommentNotificationSetting = (commentId: ID) => {
  const { data: currentUserId } = useCurrentUserId()
  const { mutate: updateSetting, ...rest } =
    useTqUpdateCommentNotificationSetting()

  const wrappedHandler = (action: 'mute' | 'unmute') => {
    if (currentUserId) {
      updateSetting({
        userId: currentUserId,
        commentId,
        action:
          action === 'mute'
            ? EntityManagerAction.MUTE
            : EntityManagerAction.UNMUTE
      })
    }
  }

  return [wrappedHandler, rest] as const
}
