import { ReactNode, useEffect, useContext } from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { playbackSelectors } from '@audius/common/store'
import cn from 'classnames'
import { connect } from 'react-redux'
import { useLocation } from 'react-router'

import { MetaTags, MetaTagsProps } from 'components/meta-tags/MetaTags'
import { ScrollContext } from 'components/scroll-provider/ScrollProvider'
import { AppState } from 'store/types'
import { getPathname } from 'utils/route'
import { getSafeArea, SafeAreaDirection } from 'utils/safeArea'

import styles from './MobilePageContainer.module.css'

const { getHasTrack } = playbackSelectors

type OwnProps = {
  children: ReactNode

  fullHeight?: boolean

  className?: string
  backgroundClassName?: string
  containerClassName?: string

  hasDefaultHeader?: boolean
  ogTitle?: string
} & MetaTagsProps

type MobilePageContainerProps = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

const BOTTOM_BAR_HEIGHT = 49
const BOTTOM_PADDING = 32

const PLAY_BAR_HEIGHT = 48

const safeAreaBottom = getSafeArea(SafeAreaDirection.BOTTOM)

const MobilePageContainer = (props: MobilePageContainerProps) => {
  const {
    backgroundClassName,
    canonicalUrl,
    children,
    className,
    containerClassName,
    description,
    hashId,
    entityType,
    fullHeight = false,
    hasDefaultHeader = false,
    hasPlayBar,
    image,
    noIndex,
    ogDescription,
    ogTitle,
    structuredData,
    title
  } = props
  const location = useLocation()
  const { getScrollForRoute, setScrollForRoute } = useContext(ScrollContext)!
  const [getInitialPathname] = useInstanceVar(getPathname(location))
  const [getLastScroll, setLastScroll] = useInstanceVar(0)

  useEffect(() => {
    const lastScrollPosition = getScrollForRoute(getInitialPathname())
    window.scrollTo(0, lastScrollPosition)
    setLastScroll(lastScrollPosition)
  }, [getScrollForRoute, getInitialPathname, setLastScroll])

  useEffect(() => {
    const onScroll = () => {
      const path = getPathname(location)
      if (path === getInitialPathname()) {
        setLastScroll(window.scrollY)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      setScrollForRoute(getInitialPathname(), getLastScroll())
      window.removeEventListener('scroll', onScroll)
    }
  }, [
    setLastScroll,
    getInitialPathname,
    setScrollForRoute,
    getLastScroll,
    location
  ])

  const paddingBottom = `${
    BOTTOM_BAR_HEIGHT +
    BOTTOM_PADDING +
    safeAreaBottom +
    (hasPlayBar ? PLAY_BAR_HEIGHT : 0)
  }px`
  const style = { paddingBottom }

  const metaTagsProps = {
    title: ogTitle ?? title,
    description,
    ogDescription,
    image,
    canonicalUrl,
    structuredData,
    noIndex,
    hashId,
    entityType
  }

  return (
    <>
      <MetaTags {...metaTagsProps} />
      <div
        className={cn(styles.container, className, containerClassName, {
          [styles.hasDefaultHeader]: hasDefaultHeader
        })}
        style={fullHeight ? undefined : style}
      >
        {children}
      </div>
      {fullHeight && (
        <div className={cn(styles.background, backgroundClassName)} />
      )}
    </>
  )
}

function mapStateToProps(state: AppState) {
  return {
    hasPlayBar: getHasTrack(state)
  }
}

function mapDispatchToProps() {
  return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(MobilePageContainer)
