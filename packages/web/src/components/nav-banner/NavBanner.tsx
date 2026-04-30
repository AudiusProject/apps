import { ReactElement } from 'react'

import {
  Flex,
  Button,
  PopupMenu,
  IconSort as SortIcon,
  Box
} from '@audius/harmony'
import { useMedia as useMediaQuery } from 'react-use'

import { MAX_PAGE_WIDTH_PX } from 'common/utils/layout'
import { removeNullable } from 'utils/typeUtils'

const messages = {
  sortByRecent: 'Sort by Recent',
  sortByPopular: 'Sort by Popular',
  openSortButton: 'Toggle Sort Mode'
}

type NavBannerProps = {
  tabs?: ReactElement | null
  dropdownDisabled?: boolean
  onChange?: (tab?: any) => void
  onSortByRecent?: () => void
  onSortByPopular?: () => void
  shouldMaskContent?: boolean
  activeTab?: any
  isArtist?: boolean
}

const NavBanner = (props: NavBannerProps) => {
  const { tabs, onSortByRecent, onSortByPopular, dropdownDisabled, isArtist } =
    props

  // Only show sort button at full width to avoid crowding the tabs
  const hideSortButton = useMediaQuery(
    `(max-width: ${MAX_PAGE_WIDTH_PX + 120}px)`
  )

  const menuItems = [
    onSortByRecent
      ? {
          text: messages.sortByRecent,
          onClick: onSortByRecent
        }
      : null,
    onSortByPopular
      ? {
          text: messages.sortByPopular,
          onClick: onSortByPopular
        }
      : null
  ].filter(removeNullable)

  return (
    <Flex w='100%' justifyContent='space-between' data-testid='nav-banner'>
      <Box w='100%'>{tabs}</Box>

      {isArtist && !hideSortButton && (
        <Box alignSelf='center'>
          {!dropdownDisabled ? (
            <PopupMenu
              items={menuItems}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              renderTrigger={(ref, triggerPopup) => (
                <Button
                  ref={ref}
                  size='small'
                  variant='secondary'
                  iconLeft={SortIcon}
                  aria-label={messages.openSortButton}
                  onClick={() => triggerPopup()}
                />
              )}
            />
          ) : null}
        </Box>
      )}
    </Flex>
  )
}

export const EmptyNavBanner = () => (
  <Box h='unit12' w='100%' backgroundColor='white' />
)

export default NavBanner
