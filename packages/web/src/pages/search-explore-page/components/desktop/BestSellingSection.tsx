import { useMemo } from 'react'

import { useBestSelling } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { BestSellingCard } from 'components/best-selling-card'
import { TrackCardSkeleton } from 'components/track/TrackCard'
import { useSearchCategory } from 'pages/search-page/hooks'

import { Carousel } from './Carousel'
import { useDeferredElement } from './useDeferredElement'

export const BestSellingSection = () => {
  const { ref, inView } = useDeferredElement()

  const [category] = useSearchCategory()

  const { data, isLoading, isError, isSuccess } = useBestSelling(
    {
      pageSize: 10,
      type:
        category === 'albums'
          ? 'album'
          : category === 'tracks'
            ? 'track'
            : 'all'
    },
    { enabled: inView }
  )

  // Deduplicate data by ID to avoid duplicate keys
  const uniqueItems = useMemo(() => {
    return data?.filter(
      (item, index, self) => self.findIndex((t) => t.id === item.id) === index
    )
  }, [data])

  if (isError || (isSuccess && !uniqueItems?.length)) {
    return null
  }

  return (
    <Carousel ref={ref} title={messages.bestSelling}>
      {!inView || !uniqueItems || isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <TrackCardSkeleton key={i} size='s' noShimmer />
          ))
        : uniqueItems?.map((item) => (
            <BestSellingCard
              key={`${item.contentType}-${item.id}`}
              item={item}
              size='s'
            />
          ))}
    </Carousel>
  )
}
