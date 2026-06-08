import { ChangeEvent, useCallback } from 'react'

import {
  libraryPageActions,
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  LibraryCategoryType,
  CommonState
} from '@audius/common/store'
import {
  FilterButton,
  SelectablePill,
  IconHeart,
  IconCart,
  IconRepost
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import styles from './LibraryCategorySelectionMenu.module.css'

const { getCategory } = libraryPageSelectors
const { setSelectedCategory } = libraryPageActions

const ALL_CATEGORIES = [
  {
    label: 'All',
    value: LibraryCategory.All
  },
  {
    label: 'Favorites',
    value: LibraryCategory.Favorite,
    icon: IconHeart
  },
  {
    label: 'Reposts',
    value: LibraryCategory.Repost,
    icon: IconRepost
  },
  {
    label: 'Premium',
    value: LibraryCategory.Purchase,
    icon: IconCart
  }
]

const CATEGORIES_WITHOUT_PURCHASED = ALL_CATEGORIES.slice(0, -1)

type LibraryCategorySelectionMenuProps = {
  currentTab: LibraryPageTabs
  variant?: 'desktop' | 'mobile'
  mode?: 'pills' | 'dropdown'
}

export const LibraryCategorySelectionMenu = (
  props: LibraryCategorySelectionMenuProps
) => {
  const { currentTab, variant = 'desktop', mode = 'pills' } = props
  const dispatch = useDispatch()
  const selectedCategory = useSelector((state: CommonState) =>
    getCategory(state, { currentTab })
  )

  const selectCategory = useCallback(
    (category: LibraryCategoryType) => {
      dispatch(
        setSelectedCategory({
          currentTab,
          category
        })
      )
    },
    [currentTab, dispatch]
  )

  const handlePillChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      selectCategory(e.target.value as LibraryCategoryType)
    },
    [selectCategory]
  )

  const handleDropdownChange = useCallback(
    (value: LibraryCategoryType) => {
      selectCategory(value)
    },
    [selectCategory]
  )

  const categories =
    currentTab !== LibraryPageTabs.PLAYLISTS
      ? ALL_CATEGORIES
      : CATEGORIES_WITHOUT_PURCHASED

  if (mode === 'dropdown') {
    return (
      <FilterButton
        label={categories[0].label}
        value={selectedCategory}
        variant='replaceLabel'
        options={categories}
        onChange={handleDropdownChange}
      />
    )
  }

  return (
    <div
      role='radiogroup'
      className={styles.container}
      onChange={handlePillChange}
    >
      {categories.map((category) => {
        const { icon, value, label } = category
        return (
          <SelectablePill
            key={value}
            type='radio'
            label={label}
            value={value}
            size={variant === 'mobile' ? 'small' : 'large'}
            icon={variant === 'mobile' ? undefined : icon}
            isSelected={selectedCategory === value}
          />
        )
      })}
    </div>
  )
}
