import { forwardRef } from 'react'

import { PopupMenu, PopupMenuItem, PopupMenuProps } from '@audius/harmony'

import { useMainContentRef } from 'pages/MainContentContext'

import CollectionMenu, {
  OwnProps as CollectionMenuProps
} from './CollectionMenu'
import TrackMenu, { OwnProps as TrackMenuProps } from './TrackMenu'
import UserMenu, { OwnProps as UserMenuProps } from './UserMenu'

export type MenuOptionType =
  | Omit<UserMenuProps, 'children'>
  | Omit<CollectionMenuProps, 'children'>
  | Omit<TrackMenuProps, 'children'>

export type MenuType = MenuOptionType['type']

export type MenuProps = {
  children: PopupMenuProps['renderTrigger']
  menu: MenuOptionType
} & Omit<PopupMenuProps, 'renderTrigger' | 'items'>

const Menu = forwardRef<HTMLDivElement, MenuProps>((props, ref) => {
  const { menu, onClose, zIndex, children, ...other } = props
  const mainContentRef = useMainContentRef()

  const renderMenu = (items: PopupMenuItem[]) => (
    <PopupMenu
      items={items}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      ref={ref}
      renderTrigger={children}
      zIndex={zIndex}
      containerRef={mainContentRef}
      {...other}
    />
  )

  if (menu.type === 'user') {
    return <UserMenu {...menu}>{renderMenu}</UserMenu>
  } else if (menu.type === 'album' || menu.type === 'playlist') {
    return (
      <CollectionMenu onClose={onClose} {...menu}>
        {renderMenu}
      </CollectionMenu>
    )
  } else if (menu.type === 'track') {
    return <TrackMenu {...menu}>{renderMenu}</TrackMenu>
  } else if (menu.type === 'notification') {
  }
  return null
})

export default Menu
