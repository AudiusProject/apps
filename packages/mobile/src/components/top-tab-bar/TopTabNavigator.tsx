import type { ComponentType, ReactNode } from 'react'

import type {
  MaterialTopTabBarProps,
  MaterialTopTabNavigationOptions
} from '@react-navigation/material-top-tabs'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import type { SvgProps } from 'react-native-svg'

import { TopTabBar } from './TopTabBar'

const Tab = createMaterialTopTabNavigator()

type TabNavigatorProps = {
  initialScreenName?: string
  children: ReactNode
  screenOptions?: MaterialTopTabNavigationOptions
  /** Replaces the default tab bar, e.g. to float it over the content. */
  tabBar?: (props: MaterialTopTabBarProps) => ReactNode
}

const renderDefaultTabBar = (props: MaterialTopTabBarProps) => (
  <TopTabBar {...props} />
)

export const TabNavigator = (props: TabNavigatorProps) => {
  const {
    initialScreenName,
    children,
    screenOptions,
    tabBar = renderDefaultTabBar
  } = props
  return (
    <Tab.Navigator
      initialRouteName={initialScreenName}
      tabBar={tabBar}
      screenOptions={screenOptions}
    >
      {children}
    </Tab.Navigator>
  )
}

type ScreenConfig = {
  name: string
  label?: string
  component: ComponentType<any>
  Icon: ComponentType<SvgProps>
}

type TabScreenConfig = ScreenConfig & {
  key?: string
  initialParams?: Record<string, unknown>
}

export const tabScreen = (config: TabScreenConfig) => {
  const { key, name, label, Icon, component, initialParams } = config
  return (
    <Tab.Screen
      key={key}
      name={name}
      component={component}
      options={{
        tabBarLabel: label ?? name,
        tabBarIcon: ({ color }) => <Icon fill={color} />
      }}
      initialParams={initialParams}
    />
  )
}

type TopTabsProps = {
  initialScreenName?: string
  screens?: ScreenConfig[]
  screenOptions?: MaterialTopTabNavigationOptions
  tabBar?: (props: MaterialTopTabBarProps) => ReactNode
}

export const TopTabNavigator = (props: TopTabsProps) => {
  const { initialScreenName, screens, screenOptions, tabBar } = props
  return (
    <TabNavigator
      initialScreenName={initialScreenName}
      screenOptions={screenOptions}
      tabBar={tabBar}
    >
      {screens?.map((screen) => tabScreen({ key: screen.name, ...screen }))}
    </TabNavigator>
  )
}
