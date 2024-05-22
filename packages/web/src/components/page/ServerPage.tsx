import {
  ReactNode,
  cloneElement,
  useRef,
  useState,
  useEffect,
  useCallback,
  MutableRefObject
} from 'react'

import cn from 'classnames'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { animated, useSpring } from 'react-spring'
// @ts-ignore
import calcScrollbarWidth from 'scrollbar-width'

import { MetaTags, MetaTagsProps } from 'components/meta-tags/MetaTags'

import styles from './Page.module.css'

const HEADER_MARGIN_PX = 32
// Pixels on the right side of the header to account for potential scrollbars
const MIN_GUTTER_WIDTH = 20

// Responsible for positioning the header
type HeaderContainerProps = Pick<ServerPageProps, 'header'> & {
  containerRef: (element: HTMLElement | null) => void
}

const HeaderContainer = (props: HeaderContainerProps) => {
  const { header, containerRef } = props

  // Need to offset the header on the right side
  // the width of the scrollbar.
  const [scrollBarWidth, setScrollbarWidth] = useState(0)

  const refreshScrollWidth = useCallback(() => {
    const width = calcScrollbarWidth(true)
    // For some odd reason, narrow windows ONLY in Firefox
    // return 0 width for the scroll bars.
    setScrollbarWidth(width > 0 ? width : MIN_GUTTER_WIDTH)
  }, [])

  useEffect(() => {
    refreshScrollWidth()
  }, [refreshScrollWidth])

  // Only Safari & Chrome support the CSS
  // frosted glasss effect.
  const [isChromeOrSafari, setIsChromeOrSafari] = useState(false)
  useEffect(() => {
    const chromeOrSafari = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      return (
        userAgent.indexOf('chrome') > -1 || userAgent.indexOf('safari') > -1
      )
    }
    setIsChromeOrSafari(chromeOrSafari)
  }, [])

  const headerContainerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={styles.headerContainer}
      ref={containerRef}
      style={{
        right: `${scrollBarWidth}px`
      }}
    >
      <div
        ref={headerContainerRef}
        className={styles.frosted}
        style={{
          // Need to set a different gradient for
          // browsers that don't support the
          // backdrop-filter frosted glass effect.
          paddingLeft: `${scrollBarWidth}px`,
          background: isChromeOrSafari
            ? 'linear-gradient(180deg, var(--page-header-gradient-1) 0%, var(--page-header-gradient-1) 20%, var(--page-header-gradient-2) 65%)'
            : 'linear-gradient(180deg, var(--page-header-gradient-1) 0%, var(--page-header-gradient-1) 40%, var(--page-header-gradient-2-alt) 85%)'
        }}
      >
        {cloneElement(header as any, {
          isChromeOrSafari,
          scrollBarWidth,
          headerContainerRef,
          topLeftElement: null
        })}
      </div>
      {/* We attach the box shadow as a separate element to
          avoid overlapping the scroll bar.
      */}
      <div className={styles.headerBoxShadow} />
    </div>
  )
}

type ServerPageProps = {
  variant?: 'insert' | 'flush'
  size?: 'medium' | 'large'
  containerRef?: MutableRefObject<any>
  className?: string
  contentClassName?: string
  containerClassName?: string
  fromOpacity?: number
  fadeDuration?: number
  header?: ReactNode

  // There are some pages which don't have a fixed header but still display
  // a search bar that scrolls with the page.
  scrollableSearch?: boolean
  children?: ReactNode
} & MetaTagsProps

export const ServerPage = (props: ServerPageProps) => {
  const {
    canonicalUrl,
    children,
    containerClassName,
    containerRef,
    contentClassName,
    description,
    fadeDuration = 200,
    fromOpacity = 0.2,
    header,
    image,
    noIndex = false,
    ogDescription,
    size = 'medium',
    structuredData,
    title,
    variant = 'inset'
  } = props

  const [headerHeight, setHeaderHeight] = useState(0)

  const calculateHeaderHeight = (element: HTMLElement | null) => {
    if (element) {
      setHeaderHeight(element.offsetHeight)
    }
  }

  const metaTagsProps = {
    title,
    description,
    ogDescription,
    image,
    canonicalUrl,
    structuredData,
    noIndex
  }

  const springProps = useSpring({
    from: { opacity: fromOpacity },
    opacity: 1,
    config: { duration: fadeDuration }
  })

  return (
    <>
      <MetaTags {...metaTagsProps} />
      <animated.div
        ref={containerRef}
        style={springProps}
        className={cn(
          styles.pageContainer,
          props.containerClassName,
          props.className
        )}
      >
        {header && (
          <HeaderContainer
            header={header}
            containerRef={calculateHeaderHeight}
          />
        )}
        <div
          className={cn({
            [styles.inset]: variant === 'inset',
            [styles.flush]: variant === 'flush',
            [styles.medium]: size === 'medium',
            [styles.large]: size === 'large',
            [containerClassName ?? '']: !!containerClassName
          })}
          style={
            variant === 'inset'
              ? { paddingTop: `${headerHeight + HEADER_MARGIN_PX}px` }
              : undefined
          }
        >
          {/* Set an id so that nested components can mount in relation to page if needed, e.g. fixed menu popups. */}
          <div
            id='page'
            className={cn(styles.pageContent, {
              [contentClassName ?? '']: !!contentClassName
            })}
          >
            {children}
          </div>
        </div>
      </animated.div>
    </>
  )
}
