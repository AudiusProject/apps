import { ID } from '~/models/Identifiers'
import { CollectionsPageType } from '~/store/pages'

import { TQCollection } from '../models'
import { SelectableQueryOptions } from '../types'

import { useCollection } from './useCollection'
import { useCollectionByPermalink } from './useCollectionByPermalink'

type CollectionParams =
  | { collectionId?: ID }
  | {
      handle?: string
      slug?: string
      collectionType?: CollectionsPageType
    }
  | { permalink?: string }

export const useCollectionByParams = <
  TResult extends { playlist_id: ID } = TQCollection
>(
  collectionParams: CollectionParams | null = {},
  options?: SelectableQueryOptions<TQCollection, TResult>
) => {
  let permalink: string | null | undefined = null
  const params = collectionParams ?? {}
  if ('permalink' in params) {
    permalink = params.permalink
  } else if ('handle' in params) {
    permalink = `/${params.handle}/${params.collectionType}/${params.slug}`
  }

  const collectionId = 'collectionId' in params ? params.collectionId : null

  const idQuery = useCollection(collectionId, options)
  const permalinkQuery = useCollectionByPermalink(permalink, options)

  const query = collectionId ? idQuery : permalinkQuery

  return query
}
