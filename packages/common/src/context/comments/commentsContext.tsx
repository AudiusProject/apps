import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useState
} from 'react'

import {
  EntityType,
  GetTrackCommentsSortMethodEnum as CommentSortMethod
} from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import {
  useTrackComments,
  QUERY_KEYS,
  useTrackCommentCount,
  resetPreviousCommentCount,
  useTrack,
  useCurrentUserId,
  getCommentSectionLoading
} from '~/api'
import { useGatedContentAccess } from '~/hooks'
import { ModalSource, ID, Comment, ReplyComment, Track } from '~/models'
import { playbackActions } from '~/store'
import { seekTo } from '~/store/playback/slice'
import { PurchaseableContentType } from '~/store/purchase-content/types'
import { usePremiumContentPurchaseModal } from '~/store/ui/modals/premium-content-purchase-modal'
import { Nullable } from '~/utils'

type CommentSectionProviderProps<NavigationProp> = {
  entityId: ID
  entityType?: EntityType.TRACK

  replyingAndEditingState?: ReplyingAndEditingState
  setReplyingAndEditingState?: (
    state: ReplyingAndEditingState | undefined
  ) => void
  navigation?: NavigationProp
  closeDrawer?: () => void
  closeAndExitNowPlaying?: (trackId: ID) => void
  uid?: string
  playbackSource?: string
}

export type ReplyingAndEditingState = {
  replyingToComment?: Comment | ReplyComment
  replyingToCommentId?: ID
  editingComment?: Comment | ReplyComment
}

type CommentSectionContextType<NavigationProp> = {
  currentUserId: Nullable<ID> | undefined
  artistId: ID
  isEntityOwner: boolean
  commentCount: number | undefined
  track: Track
  playTrack: (timestampSeconds?: number) => void
  commentSectionLoading: boolean
  commentIds: ID[]
  currentSort: CommentSortMethod
  isLoadingMorePages: boolean
  hasMorePages: boolean
  resetComments: () => void
  setCurrentSort: (sort: CommentSortMethod) => void
  loadMorePages: () => void
  hasNewComments: boolean
  isCommentCountLoading: boolean
} & Omit<CommentSectionProviderProps<NavigationProp>, 'playbackSource' | 'uid'>

export const CommentSectionContext = createContext<
  CommentSectionContextType<any> | undefined
>(undefined)

export function CommentSectionProvider<NavigationProp>(
  props: PropsWithChildren<CommentSectionProviderProps<NavigationProp>>
) {
  const {
    entityId,
    entityType = EntityType.TRACK,
    children,
    replyingAndEditingState,
    setReplyingAndEditingState,
    navigation,
    closeDrawer,
    closeAndExitNowPlaying,
    playbackSource = 'comments'
  } = props
  const { data: track } = useTrack(entityId)

  const [currentSort, setCurrentSort] = useState<CommentSortMethod>(
    CommentSortMethod.Top
  )
  const handleSetCurrentSort = (sortMethod: CommentSortMethod) => {
    resetPreviousCommentCount(queryClient, entityId)
    queryClient.resetQueries({ queryKey: [QUERY_KEYS.trackCommentList] })
    setCurrentSort(sortMethod)
  }

  const { data: currentUserId } = useCurrentUserId()

  const {
    commentIds = [],
    status,
    hasNextPage,
    fetchNextPage: loadMorePages,
    isFetchingNextPage: isLoadingMorePages
  } = useTrackComments({
    trackId: entityId,
    sortMethod: currentSort
  })

  const queryClient = useQueryClient()
  const resetComments = useCallback(() => {
    resetPreviousCommentCount(queryClient, entityId)
    queryClient.resetQueries({ queryKey: [QUERY_KEYS.trackCommentList] })
    queryClient.resetQueries({ queryKey: [QUERY_KEYS.comment] })
    queryClient.resetQueries({ queryKey: [QUERY_KEYS.commentReplies] })
  }, [queryClient, entityId])

  const { data: commentCountData, isLoading: isCommentCountLoading } =
    useTrackCommentCount(entityId, currentUserId, true)

  const hasNewComments =
    commentCountData?.previousValue !== undefined &&
    commentCountData?.currentValue !== undefined &&
    commentCountData?.previousValue < commentCountData?.currentValue
  const commentCount = commentCountData?.currentValue ?? track?.comment_count

  const dispatch = useDispatch()

  const { hasStreamAccess } = useGatedContentAccess(track!)

  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()

  const handleLoadMorePages = useCallback(() => {
    loadMorePages()
  }, [loadMorePages])

  const handleResetComments = useCallback(() => {
    resetComments()
  }, [resetComments])

  const handleCloseDrawer = useCallback(() => {
    closeDrawer?.()
    setReplyingAndEditingState?.(undefined)
  }, [closeDrawer, setReplyingAndEditingState])

  const playTrack = useCallback(
    (timestampSeconds?: number) => {
      if (!track) return

      const dispatchPlay = () => {
        dispatch(
          playbackActions.playFrom({
            tracks: [
              {
                trackId: track.track_id,
                source: playbackSource
              }
            ],
            startIndex: 0,
            querySource: null
          })
        )
      }

      if (timestampSeconds !== undefined) {
        if (!hasStreamAccess) {
          const { track_id: trackId } = track
          openPremiumContentPurchaseModal(
            { contentId: trackId, contentType: PurchaseableContentType.TRACK },
            {
              source: ModalSource.Comment
            }
          )
        } else {
          dispatchPlay()
          setTimeout(() => dispatch(seekTo({ seconds: timestampSeconds })), 100)
        }
      } else {
        dispatchPlay()
      }
    },
    [
      dispatch,
      hasStreamAccess,
      playbackSource,
      openPremiumContentPurchaseModal,
      track
    ]
  )

  const commentSectionLoading = getCommentSectionLoading({
    commentCount,
    isLoadingMorePages,
    status
  })

  if (!track) {
    return null
  }

  const { owner_id } = track

  return (
    <CommentSectionContext.Provider
      value={{
        currentUserId,
        artistId: owner_id,
        entityId,
        entityType,
        commentCount,
        isCommentCountLoading,
        commentIds,
        commentSectionLoading,
        isEntityOwner: currentUserId === owner_id,
        isLoadingMorePages,
        track,
        resetComments: handleResetComments,
        hasMorePages: !!hasNextPage,
        currentSort,
        replyingAndEditingState,
        setReplyingAndEditingState,
        setCurrentSort: handleSetCurrentSort,
        playTrack,
        loadMorePages: handleLoadMorePages,
        navigation,
        closeDrawer: handleCloseDrawer,
        closeAndExitNowPlaying,
        hasNewComments
      }}
    >
      {children}
    </CommentSectionContext.Provider>
  )
}

export const useCurrentCommentSection = () => {
  const context = useContext(CommentSectionContext)

  if (!context) {
    throw new Error(
      'useCurrentCommentSection must be used within a CommentSectionProvider'
    )
  }

  return context
}
