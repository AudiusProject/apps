import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  KeyboardEvent
} from 'react'

import { isKeyboardActivationKey, Text, Tooltip } from '@audius/harmony'
import cn from 'classnames'
import { Link, useLocation, useMatch, useResolvedPath } from 'react-router'
// eslint-disable-next-line no-restricted-imports
import { animated, useSpring } from 'react-spring'

import styles from './Tabs.module.css'

const animatedAny = animated as any

export type TabsVariant = 'desktop' | 'mobile' | 'mobileV2'

type TabsContextValue = {
  variant: TabsVariant
  // Controlled-mode value, undefined in routed mode.
  controlledValue: string | undefined
  onSelect: (value: string) => void
  // Optional click callback fired in either mode (e.g. for analytics).
  onTabClick?: (key: string) => void
  // Tabs register themselves on mount and report active state. TabList
  // computes which tab gets the accent — matched tab if any, else first.
  registerTab: (key: string, el: HTMLElement | null, isActive: boolean) => void
  // Key of the tab TabList has chosen as active (may differ from the tab's
  // own match status when no tab matches and TabList falls back to first).
  activeKey: string | null
  focusTabAt: (offset: number, fromKey: string) => void
  selectFirstTab: () => void
  selectLastTab: () => void
  disabledTabTooltipText?: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

const useTabsContext = (component: string): TabsContextValue => {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <TabList>`)
  }
  return ctx
}

type TabListProps = {
  children: ReactNode
  variant?: TabsVariant
  /**
   * Provide `value` + `onChange` for controlled mode. Omit both for routed
   * mode (each `<Tab>` uses its `to` prop with react-router).
   */
  value?: string
  onChange?: (value: string) => void
  /**
   * Fires whenever a tab is clicked, in either mode. Useful for analytics
   * — distinct from `onChange` which is only for controlled-mode state.
   */
  onTabClick?: (key: string) => void
  disabledTabTooltipText?: string
  className?: string
}

export const TabList = ({
  children,
  variant = 'desktop',
  value,
  onChange,
  onTabClick,
  disabledTabTooltipText,
  className
}: TabListProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRegistry = useRef<
    Array<{ key: string; el: HTMLElement; isActive: boolean }>
  >([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [activeEl, setActiveEl] = useState<HTMLElement | null>(null)

  const onSelect = useCallback(
    (key: string) => {
      onChange?.(key)
    },
    [onChange]
  )

  // Recompute which tab gets the accent: the active one if any reports active,
  // otherwise the first registered tab. Falling back to the first means the
  // accent is always visible when the URL doesn't yet match any subroute
  // (e.g. /handle for an artist where /handle/tracks is the canonical URL).
  const recomputeActive = useCallback(() => {
    const list = tabRegistry.current
    const matched = list.find((t) => t.isActive) ?? list[0]
    const nextKey = matched?.key ?? null
    const nextEl = matched?.el ?? null
    setActiveKey((prev) => (prev === nextKey ? prev : nextKey))
    setActiveEl((prev) => (prev === nextEl ? prev : nextEl))
  }, [])

  const registerTab = useCallback(
    (key: string, el: HTMLElement | null, isActive: boolean) => {
      const list = tabRegistry.current
      if (el) {
        const existing = list.findIndex((t) => t.key === key)
        if (existing >= 0) {
          list[existing] = { key, el, isActive }
        } else {
          list.push({ key, el, isActive })
        }
      } else {
        tabRegistry.current = list.filter((t) => t.key !== key)
      }
      recomputeActive()
    },
    [recomputeActive]
  )

  const focusTabAt = useCallback((offset: number, fromKey: string) => {
    const list = tabRegistry.current
    const fromIdx = list.findIndex((t) => t.key === fromKey)
    if (fromIdx < 0) return
    const nextIdx = (fromIdx + offset + list.length) % list.length
    list[nextIdx]?.el.focus()
  }, [])

  const selectFirstTab = useCallback(() => {
    tabRegistry.current[0]?.el.focus()
  }, [])

  const selectLastTab = useCallback(() => {
    const list = tabRegistry.current
    list[list.length - 1]?.el.focus()
  }, [])

  const ctx = useMemo<TabsContextValue>(
    () => ({
      variant,
      controlledValue: value,
      onSelect,
      onTabClick,
      registerTab,
      activeKey,
      focusTabAt,
      selectFirstTab,
      selectLastTab,
      disabledTabTooltipText
    }),
    [
      variant,
      value,
      onSelect,
      onTabClick,
      registerTab,
      activeKey,
      focusTabAt,
      selectFirstTab,
      selectLastTab,
      disabledTabTooltipText
    ]
  )

  // Animate the accent underline to follow the active tab.
  // react-spring v8's typings don't match the runtime API for the setter.
  const [accentSpring, setAccentSpringRaw] = useSpring(() => ({
    from: { left: 0, top: 0, width: 0 },
    config: { mass: 1, tension: 300, friction: 32, clamp: true }
  }))
  const setAccentSpring = setAccentSpringRaw as unknown as (props: {
    to: { left: number; top: number; width: number }
    immediate?: boolean
  }) => void
  const hasPositioned = useRef(false)

  const positionAccent = useCallback(() => {
    if (!activeEl) return
    const left = activeEl.offsetLeft
    const top = activeEl.offsetTop + activeEl.offsetHeight
    const width = activeEl.offsetWidth
    setAccentSpring({
      to: { left, top, width },
      immediate: !hasPositioned.current
    })
    hasPositioned.current = true
  }, [activeEl, setAccentSpring])

  useLayoutEffect(() => {
    positionAccent()
  }, [positionAccent])

  // Reposition on container/tab resize (e.g. hideText toggle, font load).
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const els = [containerRef.current, activeEl].filter(
      Boolean
    ) as HTMLElement[]
    if (els.length === 0) return
    const observer = new ResizeObserver(() => positionAccent())
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [activeEl, positionAccent])

  // Reposition on window resize too (handles container reflow without size change).
  useEffect(() => {
    const onResize = () => positionAccent()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [positionAccent])

  return (
    <TabsContext.Provider value={ctx}>
      <div
        ref={containerRef}
        role='tablist'
        className={cn(
          styles.tabList,
          {
            [styles.tabListDesktop]: variant === 'desktop',
            [styles.tabListMobile]: variant === 'mobile',
            [styles.tabListMobileV2]: variant === 'mobileV2'
          },
          className
        )}
      >
        {children}
        {activeEl ? (
          <animatedAny.div className={styles.accent} style={accentSpring} />
        ) : null}
      </div>
    </TabsContext.Provider>
  )
}

type CommonTabProps = {
  icon?: ReactNode
  children: ReactNode
  hideText?: boolean
  disabled?: boolean
  disabledTooltipText?: string
}

export type TabProps = CommonTabProps &
  ({ to: string; value?: never } | { value: string; to?: never })

const useIsRouteActive = (to: string | undefined) => {
  // useResolvedPath/useMatch must be called unconditionally for hook rules.
  // When `to` is undefined (controlled mode), pass a stub path; the result
  // is ignored.
  const resolved = useResolvedPath(to ?? '.')
  const match = useMatch({ path: resolved.pathname, end: true })
  return to !== undefined && match !== null
}

export const Tab = ({
  to,
  value,
  icon,
  children,
  hideText,
  disabled,
  disabledTooltipText
}: TabProps) => {
  const ctx = useTabsContext('Tab')
  const tabRef = useRef<HTMLElement>(null)

  // Local match: does THIS tab's identifier line up with the URL or with the
  // controlled value? TabList aggregates these to pick the highlighted tab.
  const isRouteActive = useIsRouteActive(to)
  const localMatch =
    to !== undefined ? isRouteActive : ctx.controlledValue === value

  const key = (to ?? value)!

  // Final active: TabList's chosen activeKey wins. This handles the fallback
  // case where no tab matches the URL — TabList picks the first registered.
  const isActive = ctx.activeKey === key

  // Register with TabList. Re-runs when localMatch changes so TabList can
  // recompute which tab gets the accent underline.
  useEffect(() => {
    ctx.registerTab(key, tabRef.current, localMatch)
    return () => ctx.registerTab(key, null, false)
  }, [ctx, key, localMatch])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (disabled) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        ctx.focusTabAt(1, key)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        ctx.focusTabAt(-1, key)
      } else if (e.key === 'Home') {
        e.preventDefault()
        ctx.selectFirstTab()
      } else if (e.key === 'End') {
        e.preventDefault()
        ctx.selectLastTab()
      } else if (
        isKeyboardActivationKey(e) &&
        value !== undefined &&
        to === undefined
      ) {
        // Controlled mode: Enter/Space activates. (NavLink handles this for routed.)
        e.preventDefault()
        ctx.onSelect(value)
      }
    },
    [disabled, ctx, key, value, to]
  )

  const className = cn(styles.tab, {
    [styles.tabDesktop]: ctx.variant === 'desktop',
    [styles.tabMobile]: ctx.variant === 'mobile',
    [styles.tabMobileV2]: ctx.variant === 'mobileV2',
    [styles.tabDesktopIconOnly]: ctx.variant === 'desktop' && hideText,
    [styles.tabActive]: isActive,
    [styles.tabDisabled]: !!disabled
  })

  const labelText = (() => {
    if (hideText) return null
    if (ctx.variant === 'mobile') {
      return (
        <Text variant='body' size='xs' strength='strong' color='inherit'>
          {children}
        </Text>
      )
    }
    if (ctx.variant === 'mobileV2') {
      return (
        <Text variant='body' strength='strong' color='inherit'>
          {children}
        </Text>
      )
    }
    return (
      <Text variant='title' color='inherit'>
        {children}
      </Text>
    )
  })()

  const inner = (
    <>
      {icon}
      {labelText}
    </>
  )

  const tooltipText = disabled
    ? (disabledTooltipText ?? ctx.disabledTabTooltipText)
    : undefined

  const commonAttrs = {
    role: 'tab' as const,
    tabIndex: disabled ? -1 : 0,
    'aria-selected': isActive,
    'aria-disabled': disabled || undefined,
    'aria-label': typeof children === 'string' ? children : undefined,
    onKeyDown: handleKeyDown,
    className
  }

  // Preserve the current query string when navigating between tabs (e.g.
  // Library's ?filter= and ?search= should survive tab clicks).
  const currentSearch = useLocation().search

  const tabElement =
    to !== undefined ? (
      <Link
        ref={tabRef as React.Ref<HTMLAnchorElement>}
        to={{ pathname: to, search: currentSearch }}
        {...commonAttrs}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault()
            return
          }
          ctx.onTabClick?.(key)
        }}
      >
        {inner}
      </Link>
    ) : (
      <button
        ref={tabRef as React.Ref<HTMLButtonElement>}
        type='button'
        {...commonAttrs}
        onClick={() => {
          if (disabled) return
          if (value !== undefined) ctx.onSelect(value)
          ctx.onTabClick?.(key)
        }}
      >
        {inner}
      </button>
    )

  return (
    <Tooltip
      text={tooltipText}
      placement='bottom'
      mount='body'
      disabled={!tooltipText}
    >
      {tabElement}
    </Tooltip>
  )
}
