import { ID, Status } from '@audius/common/models'

import { CollectionCard } from 'components/collection'
import Header from 'components/header/desktop/Header'
import CardLineup from 'components/lineup/CardLineup'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import Page from 'components/page/Page'
import { BASE_URL, EXPLORE_PAGE } from 'utils/route'

import styles from './CollectionsPage.module.css'

export type CollectionsPageProps = {
  title: string
  description: string
  collectionIds: ID[]
  status: Status
}

const CollectionsPage = (props: CollectionsPageProps) => {
  const { title, description, collectionIds, status } = props
  const header = (
    <Header
      primary={title}
      secondary={description}
      containerStyles={description ? styles.header : null}
      wrapperClassName={description ? styles.headerWrapper : null}
    />
  )

  const cards = collectionIds.map((id) => {
    return <CollectionCard key={id} id={id} size='l' />
  })

  return (
    <Page
      title={title}
      description={description}
      canonicalUrl={`${BASE_URL}${EXPLORE_PAGE}`}
      contentClassName={styles.page}
      header={header}
    >
      {status === Status.LOADING ? (
        <LoadingSpinner className={styles.spinner} />
      ) : (
        <CardLineup cards={cards} cardsClassName={styles.cardsContainer} />
      )}
    </Page>
  )
}

export default CollectionsPage
