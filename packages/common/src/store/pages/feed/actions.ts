import { FeedFilter } from '~/models/FeedFilter'
import { ID } from '~/models/Identifiers'

export const FOLLOW_USERS = 'FEED/FOLLOW_USERS'
export const SET_FEED_FILTER = 'FEED/SET_FEED_FILTER'

export type FollowUsersAction = {
  type: typeof FOLLOW_USERS
  userIds: ID[]
}

export type SetFeedFilterAction = {
  type: typeof SET_FEED_FILTER
  filter: FeedFilter
}

export type FeedPageAction = FollowUsersAction | SetFeedFilterAction

export const followUsers = (userIds: ID[]): FollowUsersAction => ({
  type: FOLLOW_USERS,
  userIds
})

export const setFeedFilter = (filter: FeedFilter): SetFeedFilterAction => ({
  type: SET_FEED_FILTER,
  filter
})
