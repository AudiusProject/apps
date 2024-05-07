import { ReactNode, useEffect, useContext } from 'react'

import cn from 'classnames'

import { useHistoryContext } from 'app/HistoryProvider'
import { MetaTags, MetaTagsProps } from 'components/meta-tags/MetaTags'
import { ScrollContext } from 'components/scroll-provider/ScrollProvider'
import { useInstanceVar } from 'hooks/useInstanceVar'
import { getPathname } from 'utils/route'
import { getSafeArea, SafeAreaDirection } from 'utils/safeArea'

import styles from './MobilePageContainer.module.css'

type OwnProps = {
  children: ReactNode

  // Whether or not to always render the page at full viewport height.
  // Defaults to false.
  fullHeight?: boolean

  className?: string
  // If full height specified, optionally pass in a classname for the
  // background div.
  backgroundClassName?: string
  containerClassName?: string

  // Has the default header and should add margins to the top for it
  hasDefaultHeader?: boolean
} & MetaTagsProps

type MobilePageContainerProps = OwnProps

// Height of the bottom nav bar in px
const BOTTOM_BAR_HEIGHT = 49
// Padding between bottom of content and the
// bottom bars
const BOTTOM_PADDING = 32

const safeAreaBottom = getSafeArea(SafeAreaDirection.BOTTOM)

export const ServerMobilePageContainer = (props: MobilePageContainerProps) => {
  const {
    backgroundClassName,
    canonicalUrl,
    children,
    className,
    containerClassName,
    description,
    fullHeight = false,
    hasDefaultHeader = false,
    image,
    noIndex,
    ogDescription,
    structuredData,
    title
  } = props
  const { history } = useHistoryContext()
  const { getScrollForRoute, setScrollForRoute } = useContext(ScrollContext)!
  const [getInitialPathname] = useInstanceVar(getPathname(history.location))
  const [getLastScroll, setLastScroll] = useInstanceVar(0)

  // On mount, restore the last scroll position
  useEffect(() => {
    const lastScrollPosition = getScrollForRoute(getInitialPathname())
    window.scrollTo(0, lastScrollPosition)
    setLastScroll(lastScrollPosition)
  }, [getScrollForRoute, getInitialPathname, setLastScroll])

  useEffect(() => {
    // Store Y scroll in instance var as we scroll
    const onScroll = () => {
      const path = getPathname(history.location)
      // We can stay mounted after switching
      // paths, so check for this case
      if (path === getInitialPathname()) {
        setLastScroll(window.scrollY)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    // Save the valid scroll on unmount
    return () => {
      setScrollForRoute(getInitialPathname(), getLastScroll())
      window.removeEventListener('scroll', onScroll)
    }
  }, [
    setLastScroll,
    getInitialPathname,
    setScrollForRoute,
    getLastScroll,
    history
  ])

  const paddingBottom = `${
    BOTTOM_BAR_HEIGHT + BOTTOM_PADDING + safeAreaBottom
  }px`
  const style = { paddingBottom }

  const metaTagsProps = {
    title,
    description,
    ogDescription,
    image,
    canonicalUrl,
    structuredData,
    noIndex
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
