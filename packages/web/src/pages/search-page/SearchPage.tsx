import { useContext, useEffect } from 'react'

import { SearchCategory } from '@audius/common/api'
import { Flex, useTheme } from '@audius/harmony'
import { useSearchParams } from 'react-router'

import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  CenterPreset,
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { fullSearchResultsPage } from 'utils/route'

import { RecentSearches } from './RecentSearches'
import { SearchCatalogTile } from './SearchCatalogTile'
import { SearchHeader } from './SearchHeader'
import { SearchResults } from './SearchResults'
import { useSearchCategory, useShowSearchResults } from './hooks'

export const SearchPage = () => {
  const isMobile = useIsMobile()
  const [category] = useSearchCategory()
  const [urlSearchParams] = useSearchParams()
  const query = urlSearchParams.get('query')
  const showSearchResults = useShowSearchResults()
  const { color } = useTheme()

  // Set nav header
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setCenter(CenterPreset.LOGO)
    setRight(RightPreset.KEBAB)
  }, [setLeft, setCenter, setRight])

  const header = <SearchHeader />

  const PageComponent = isMobile ? MobilePageContainer : Page

  return (
    <PageComponent
      title={query ?? 'Search'}
      description={`Search results for ${query}`}
      canonicalUrl={fullSearchResultsPage(
        category as SearchCategory,
        query ?? ''
      )}
      header={header}
      fullHeight
    >
      <Flex
        direction='column'
        w='100%'
        h='100%'
        style={isMobile ? { backgroundColor: color.background.white } : {}}
      >
        {isMobile ? header : null}
        {!showSearchResults ? (
          <Flex
            direction='column'
            alignItems='center'
            gap={isMobile ? 'xl' : 'l'}
          >
            <SearchCatalogTile />
            <RecentSearches />
          </Flex>
        ) : (
          <SearchResults />
        )}
      </Flex>
    </PageComponent>
  )
}
