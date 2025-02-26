import {
  ReactNode,
  cloneElement,
  useRef,
  useState,
  useEffect,
  MutableRefObject
} from 'react'

import { Box, Flex } from '@audius/harmony'
import { animated, useSpring } from '@react-spring/web'
import cn from 'classnames'

import { MetaTags, MetaTagsProps } from 'components/meta-tags/MetaTags'
import DesktopSearchBar from 'components/search-bar/ConnectedSearchBar'

import { FlushPageContainer } from './FlushPageContainer'
import styles from './Page.module.css'

const HEADER_MARGIN_PX = 32

// Responsible for positioning the header
type HeaderContainerProps = Pick<PageProps, 'header' | 'showSearch'>

const HeaderContainer = (props: HeaderContainerProps) => {
  const { header, showSearch } = props

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
    <div className={styles.headerContainer}>
      <div
        ref={headerContainerRef}
        className={styles.frosted}
        style={{
          // Need to set a different gradient for
          // browsers that don't support the
          // backdrop-filter frosted glass effect.
          background: isChromeOrSafari
            ? 'linear-gradient(180deg, var(--harmony-n-25) 0%, var(--harmony-n-25) 20%, var(--page-header-gradient-2) 65%)'
            : 'linear-gradient(180deg, var(--harmony-n-25) 0%, var(--page-n-25) 40%, var(--page-header-gradient-2-alt) 85%)'
        }}
      >
        {cloneElement(header as any, {
          isChromeOrSafari,
          headerContainerRef,
          topLeftElement: showSearch ? <DesktopSearchBar /> : null
        })}
      </div>
      {/* We attach the box shadow as a separate element to
          avoid overlapping the scroll bar.
      */}
      <div className={styles.headerBoxShadow} />
    </div>
  )
}

type PageProps = {
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
  showSearch?: boolean
} & MetaTagsProps

export const Page = (props: PageProps) => {
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
    scrollableSearch = false,
    showSearch = true,
    size = 'medium',
    structuredData,
    title,
    variant = 'inset'
  } = props

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
        {header && <HeaderContainer header={header} showSearch={showSearch} />}
        <div
          className={cn({
            [styles.inset]: variant === 'inset',
            [styles.flush]: variant === 'flush',
            [styles.medium]: size === 'medium',
            [styles.large]: size === 'large',
            [containerClassName ?? '']: !!containerClassName
          })}
          style={
            variant === 'inset' ? { paddingTop: HEADER_MARGIN_PX } : undefined
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

        {scrollableSearch &&
          (variant === 'flush' ? (
            <Box
              css={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              <FlushPageContainer mt='2xl'>
                <Flex flex={1} justifyContent='flex-start'>
                  <DesktopSearchBar />
                </Flex>
              </FlushPageContainer>
            </Box>
          ) : (
            <div className={styles.searchWrapper}>
              <DesktopSearchBar />
            </div>
          ))}
      </animated.div>
    </>
  )
}

export default Page
