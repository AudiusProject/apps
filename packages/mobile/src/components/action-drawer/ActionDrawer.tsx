import type { ReactNode } from 'react'
import { useCallback } from 'react'

import type { Modals } from '@audius/common/store'
import type { TextStyle, ViewStyle } from 'react-native'
import { TouchableHighlight, View } from 'react-native'
import type { SetOptional } from 'type-fest'

import { Text } from 'app/components/core'
import { useDrawer } from 'app/hooks/useDrawer'
import type { Drawer } from 'app/store/drawers/slice'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import type { AppDrawerProps } from '../drawer/AppDrawer'
import { AppDrawer, useDrawerState } from '../drawer/AppDrawer'
import { NativeDrawer, type NativeDrawerProps } from '../drawer/NativeDrawer'

export type ActionDrawerRow = {
  text: string
  icon?: ReactNode
  style?: TextStyle
  callback?: () => void
  isDestructive?: boolean
}

export type ActionDrawerContentProps = {
  rows: ActionDrawerRow[]
  styles?: { row?: ViewStyle }
  disableAutoClose?: boolean
  children?: ReactNode | ReactNode[]
} & Pick<AppDrawerProps, 'onClose'>

type ActionDrawerProps = ActionDrawerContentProps &
  (
    | ({
        modalName: Modals
      } & SetOptional<AppDrawerProps, 'children'>)
    | ({
        drawerName: Drawer
      } & SetOptional<NativeDrawerProps, 'children'>)
  )

const useStyles = makeStyles(({ palette, typography, spacing }) => ({
  row: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8
  },
  title: {
    fontSize: typography.fontSize.medium
  },
  action: {
    fontSize: typography.fontSize.xl,
    paddingTop: spacing(1),
    color: palette.secondary
  },
  actionIcon: {
    minWidth: 42
  },
  destructiveAction: {
    color: palette.accentRed
  }
}))

export const ActionDrawerContent = (props: ActionDrawerContentProps) => {
  const {
    rows,
    styles: stylesProp,
    disableAutoClose,
    children,
    onClose
  } = props

  const styles = useStyles()

  const didSelectRow = useCallback(
    (index: number) => {
      const { callback } = rows[index]
      if (!disableAutoClose) {
        onClose?.()
      }
      if (callback) {
        callback()
      }
    },
    [rows, onClose, disableAutoClose]
  )

  const { neutralLight9 } = useThemeColors()

  return (
    <View>
      {children}
      {rows.map(({ text, isDestructive = false, icon, style }, index) => (
        <TouchableHighlight
          key={`${text}-${index}`}
          onPress={() => {
            didSelectRow(index)
          }}
          underlayColor={neutralLight9}
        >
          <View style={[styles.row, stylesProp?.row]}>
            {icon ? <View style={styles.actionIcon}>{icon}</View> : null}
            <Text
              fontSize='xl'
              weight='demiBold'
              color={isDestructive ? 'accentRed' : 'secondary'}
              style={style}
            >
              {text}
            </Text>
          </View>
        </TouchableHighlight>
      ))}
    </View>
  )
}

const ActionDrawer = (props: ActionDrawerProps) => {
  const {
    rows,
    styles: stylesProp,
    disableAutoClose,
    children,
    ...other
  } = props
  const { onClose } =
    'modalName' in props
      ? // eslint-disable-next-line react-hooks/rules-of-hooks
        useDrawerState(props.modalName)
      : // eslint-disable-next-line react-hooks/rules-of-hooks
        useDrawer(props.drawerName)

  const Drawer = 'modalName' in props ? AppDrawer : NativeDrawer

  return (
    // @ts-expect-error
    <Drawer {...other}>
      <ActionDrawerContent
        onClose={onClose}
        rows={rows}
        styles={stylesProp}
        disableAutoClose={disableAutoClose}
      >
        {children}
      </ActionDrawerContent>
    </Drawer>
  )
}

export default ActionDrawer
