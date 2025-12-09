import type { ReactElement } from 'react'
import { useRef } from 'react'

import type { MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs'
import type { DefaultRouterOptions } from '@react-navigation/native'
import {
  createNavigatorFactory,
  TabRouter,
  useNavigationBuilder
} from '@react-navigation/native'
import type {
  CollapsibleProps,
  CollapsibleRef
} from 'react-native-collapsible-tab-view'
import { Tabs } from 'react-native-collapsible-tab-view'

import { useTheme } from '@audius/harmony-native'

import type { CollapsibleTopTabBarProps } from './CollapsibleTopTabBar'

type CollapsibleTabNavigatorProps = Omit<CollapsibleProps, 'renderTabBar'> &
  DefaultRouterOptions & {
    screenOptions: MaterialTopTabNavigationOptions
    renderTabBar: (props: CollapsibleTopTabBarProps) => ReactElement
  }

export const CollapsibleTabNavigator = ({
  renderHeader,
  initialRouteName,
  children,
  screenOptions,
  headerHeight,
  renderTabBar
}: CollapsibleTabNavigatorProps) => {
  const { state, navigation, descriptors } = useNavigationBuilder(TabRouter, {
    children,
    screenOptions,
    initialRouteName
  })

  const ref = useRef<CollapsibleRef | null>(null)

  const onTabChange = ({ tabName, index, prevIndex }) => {
    const target = tabName.toString()
    // A swipe occured we need to navigate
    if (index !== prevIndex) {
      navigation.navigate(target)
    }
  }

  const { color } = useTheme()

  return (
    <Tabs.Container
      ref={ref}
      allowHeaderOverscroll
      initialTabName={state.routes[state.index].name}
      headerContainerStyle={{
        shadowColor: color.neutral.n900,
        shadowOpacity: 0.12,
        shadowOffset: { height: 2, width: 0 },
        shadowRadius: 2
      }}
      renderHeader={renderHeader}
      headerHeight={headerHeight}
      snapThreshold={null}
      renderTabBar={(props) =>
        renderTabBar({
          ...props,
          state,
          navigation,
          // @ts-expect-error
          descriptors
        })
      }
      onTabChange={onTabChange}
      lazy={screenOptions?.lazy ?? false}
    >
      {state.routes.map((route) => (
        <Tabs.Tab
          key={route.key}
          name={route.name}
          label={descriptors[route.key]?.options?.title ?? route.name}
        >
          {descriptors[route.key].render()}
        </Tabs.Tab>
      ))}
    </Tabs.Container>
  )
}

export const createCollapsibleTabNavigator = createNavigatorFactory(
  CollapsibleTabNavigator
)
