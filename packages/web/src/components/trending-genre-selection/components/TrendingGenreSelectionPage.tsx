import { useEffect, useContext } from 'react'

import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'
import GenreSelectionList from 'pages/trending-page/components/GenreSelectionList'

import styles from './TrendingGenreSelectionPage.module.css'

type TrendingGenreSelectionPageProps = {
  selectedGenre: string | null
  didSelectGenre: (genre: string | null) => void
  genres: string[]
  topGenres?: string[]
}

const messages = {
  title: 'PICK A GENRE'
}

const TrendingGenreSelectionPage = ({
  selectedGenre,
  didSelectGenre,
  genres,
  topGenres
}: TrendingGenreSelectionPageProps) => {
  const { setLeft, setCenter, setRight } = useContext(NavContext)!

  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setCenter(messages.title)
    setRight(null)
  }, [setLeft, setCenter, setRight])

  return (
    <MobilePageContainer backgroundClassName={styles.pageBackground} fullHeight>
      <GenreSelectionList
        genres={genres}
        topGenres={topGenres}
        didSelectGenre={didSelectGenre}
        selectedGenre={selectedGenre}
        containerClassName={styles.container}
        isMobile
      />
    </MobilePageContainer>
  )
}

export default TrendingGenreSelectionPage
