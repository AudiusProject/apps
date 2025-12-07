import { useRef } from 'react'

import { useRelatedArtistsUsers } from '@audius/common/api'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import {
  ArtistRecommendations,
  ArtistRecommendationsProps
} from './ArtistRecommendations'
import styles from './ArtistRecommendationsDropdown.module.css'
const animatedAny = animated as any

type ArtistRecommendationsDropdownProps = Omit<
  ArtistRecommendationsProps,
  'ref' | 'className' | 'itemClassName'
> & {
  isVisible: boolean
}

const fast = {
  tension: 300,
  friction: 40
}

export const ArtistRecommendationsDropdown = (
  props: ArtistRecommendationsDropdownProps
) => {
  const { isVisible, artistId } = props
  const childRef = useRef<HTMLDivElement | null>(null)

  const { data: suggestedArtists = [], isLoading } = useRelatedArtistsUsers({
    artistId,
    filterFollowed: true,
    pageSize: 7
  })

  const shouldShowDropdown =
    isVisible && !isLoading && suggestedArtists.length > 0

  const rect = childRef.current?.getBoundingClientRect()
  const childHeight = rect ? rect.bottom - rect.top : 0

  const spring = useSpring({
    opacity: shouldShowDropdown ? 1 : 0,
    height: shouldShowDropdown ? `${childHeight}px` : '0',
    from: { opacity: 0, height: `${childHeight}px` },
    config: fast
  })

  if (!shouldShowDropdown) return null

  return (
    <animatedAny.div className={styles.dropdown} style={spring}>
      <ArtistRecommendations
        ref={childRef}
        className={styles.artistRecommendations}
        itemClassName={styles.artistRecommendationsItem}
        {...props}
      />
    </animatedAny.div>
  )
}
