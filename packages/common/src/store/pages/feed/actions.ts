import { FeedFilter } from '~/models/FeedFilter'
import { FeedTab } from '~/models/FeedTab'
import { ID } from '~/models/Identifiers'

export const FOLLOW_USERS = 'FEED/FOLLOW_USERS'
export const SET_FEED_FILTER = 'FEED/SET_FEED_FILTER'
export const SET_FEED_TAB = 'FEED/SET_FEED_TAB'

export type FollowUsersAction = {
  type: typeof FOLLOW_USERS
  userIds: ID[]
}

export type SetFeedFilterAction = {
  type: typeof SET_FEED_FILTER
  filter: FeedFilter
}

export type SetFeedTabAction = {
  type: typeof SET_FEED_TAB
  tab: FeedTab
}

export type FeedPageAction =
  | FollowUsersAction
  | SetFeedFilterAction
  | SetFeedTabAction

export const followUsers = (userIds: ID[]): FollowUsersAction => ({
  type: FOLLOW_USERS,
  userIds
})

export const setFeedFilter = (filter: FeedFilter): SetFeedFilterAction => ({
  type: SET_FEED_FILTER,
  filter
})

export const setFeedTab = (tab: FeedTab): SetFeedTabAction => ({
  type: SET_FEED_TAB,
  tab
})
