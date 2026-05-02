import type { RouteProp } from '@react-navigation/native'

type ProfileTabParamList = {
  Reposts: { lazy?: boolean }
  Albums: {}
  Playlists: {}
  Tracks: {}
  Contests: { lazy?: boolean }
}

export type ProfileTabRoutes<RouteName extends keyof ProfileTabParamList> =
  RouteProp<ProfileTabParamList, RouteName>
