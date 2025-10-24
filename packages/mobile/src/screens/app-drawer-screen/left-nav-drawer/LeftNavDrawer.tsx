import { useHasAccount } from '@audius/common/api'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'

import {
  Flex,
  IconAudiusLogoHorizontalNew,
  useTheme
} from '@audius/harmony-native'

import { AppDrawerContextProvider } from '../AppDrawerContext'

import { AccountDetails } from './AccountDetails'
import { VanityMetrics } from './VanityMetrics'
import {
  ProfileNavItem,
  MessagesNavItem,
  WalletNavItem,
  ArtistCoinsNavItem,
  RewardsNavItem,
  UploadNavItem,
  SettingsNavItem,
  FeatureFlagsNavItem
} from './nav-items'

type AccountDrawerProps = DrawerContentComponentProps & {
  gesturesDisabled: boolean
  setGesturesDisabled: (disabled: boolean) => void
}

export const LeftNavDrawer = (props: AccountDrawerProps) => {
  const { navigation: drawerHelpers, ...other } = props
  const hasAccount = useHasAccount()
  if (!hasAccount) return null

  return (
    <AppDrawerContextProvider drawerHelpers={drawerHelpers} {...other}>
      <WrappedLeftNavDrawer />
    </AppDrawerContextProvider>
  )
}

const WrappedLeftNavDrawer = () => {
  const { spacing } = useTheme()

  return (
    <Flex h='100%' pv='unit16' justifyContent='space-between'>
      <Flex>
        <AccountDetails />
        <VanityMetrics />
        <ProfileNavItem />
        <MessagesNavItem />
        <WalletNavItem />
        <ArtistCoinsNavItem />
        <RewardsNavItem />
        <UploadNavItem />
        <SettingsNavItem />
        <FeatureFlagsNavItem />
      </Flex>
      <Flex ph='xl'>
        <IconAudiusLogoHorizontalNew
          color='subdued'
          height={spacing.unit6}
          width={spacing['5xl']}
        />
      </Flex>
    </Flex>
  )
}
