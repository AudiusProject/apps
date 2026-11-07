import { useEffect } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'
import type { ProfileTabScreenParamList } from 'app/screens/app-screen/ProfileTabScreen'

const PATH_TO_SCREEN = {
  'accounts-you-manage': 'AccountsYouManageScreen',
  'managing-you': 'AccountsManagingYouScreen'
} as const

/** Handles /settings/accounts-you-manage and /settings/managing-you links */
export const useShowManagerModeNotAvailable = () => {
  const { params } = useRoute()
  const path = (params as { path: string })?.path
  const navigation = useNavigation<ProfileTabScreenParamList>()
  const { onOpen: openManagerModeDrawer } = useDrawer('ManagerMode')
  const { isEnabled: isManagerModeEnabled, isLoaded } = useFeatureFlag(
    FeatureFlags.MOBILE_MANAGER_MODE
  )

  useEffect(() => {
    if (!isLoaded || !(path in PATH_TO_SCREEN)) return
    if (isManagerModeEnabled) {
      navigation.push(PATH_TO_SCREEN[path as keyof typeof PATH_TO_SCREEN])
    } else if (path === 'accounts-you-manage') {
      openManagerModeDrawer()
    }
  }, [path, isLoaded, isManagerModeEnabled, navigation, openManagerModeDrawer])
}
