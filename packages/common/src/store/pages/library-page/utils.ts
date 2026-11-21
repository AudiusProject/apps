import { LibraryCategory, LibraryCategoryType, LibraryPageTabs } from './types'

export const calculateNewLibraryCategories = ({
  currentTab,
  chosenCategory,
  prevTracksCategory
}: {
  currentTab: LibraryPageTabs
  chosenCategory: LibraryCategoryType
  prevTracksCategory: unknown
}) => {
  if (
    currentTab === LibraryPageTabs.TRACKS &&
    chosenCategory === LibraryCategory.Purchase
  ) {
    return {
      tracksCategory: chosenCategory,
      collectionsCategory: LibraryCategory.All
    }
  }
  if (
    (currentTab === LibraryPageTabs.ALBUMS ||
      currentTab === LibraryPageTabs.PLAYLISTS) &&
    prevTracksCategory === LibraryCategory.Purchase
  ) {
    return {
      tracksCategory: prevTracksCategory,
      collectionsCategory: chosenCategory
    }
  }

  return {
    collectionsCategory: chosenCategory,
    tracksCategory: chosenCategory
  }
}
