import { createContext, useContext } from 'react'

type NavSidebarContextType = {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export const NavSidebarContext = createContext<NavSidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {}
})

export const useNavSidebar = () => useContext(NavSidebarContext)
