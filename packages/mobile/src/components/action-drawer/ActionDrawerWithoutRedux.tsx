import type { SetOptional } from 'type-fest'

import Drawer from '../drawer'
import type { DrawerProps } from '../drawer/Drawer'

import type { ActionDrawerContentProps } from './ActionDrawer'
import { ActionDrawerContent } from './ActionDrawer'

type ActionDrawerWithoutReduxProps = ActionDrawerContentProps &
  SetOptional<DrawerProps, 'children'>

export const ActionDrawerWithoutRedux = (
  props: ActionDrawerWithoutReduxProps
) => {
  const {
    rows,
    styles: stylesProp,
    disableAutoClose,
    children,
    ...other
  } = props
  const { onClose } = other

  return (
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
