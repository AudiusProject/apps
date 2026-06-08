import { LibraryScreen } from 'app/screens/library-screen'

import type { AppTabScreenParamList } from './AppTabScreen'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type FavoritesTabScreenParamList = AppTabScreenParamList & {
  Favorites: undefined
  CreatePlaylist: undefined
}

export const FavoritesTabScreen =
  createAppTabScreenStack<FavoritesTabScreenParamList>((Stack) => (
    <>
      <Stack.Screen
        name='Library'
        component={LibraryScreen}
        options={{ freezeOnBlur: true }}
      />
    </>
  ))
