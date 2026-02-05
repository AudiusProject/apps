export enum UserListType {
  REPOST = 'REPOST',
  FAVORITE = 'FAVORITE',
  FOLLOWER = 'FOLLOWER',
  FOLLOWING = 'FOLLOWING',
  MUTUAL_FOLLOWER = 'MUTUAL_FOLLOWER',
  NOTIFICATION = 'NOTIFICATION',
  RELATED_ARTISTS = 'RELATED_ARTISTS',
  PURCHASER = 'PURCHASER',
  REMIXER = 'REMIXER',
  COIN_LEADERBOARD = 'COIN_LEADERBOARD'
}

export enum UserListEntityType {
  TRACK = 'TRACK',
  COLLECTION = 'COLLECTION',
  USER = 'USER'
}

export type UserListModalState = {
  userListType: UserListType
  isOpen: boolean
  entityType: UserListEntityType
}

export const v2UserListTypes = [UserListType.FOLLOWER, UserListType.FAVORITE]
