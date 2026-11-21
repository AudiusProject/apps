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
  controlledValue: string | undefined
  onSelect: (value: string) => void
  onTabClick?: (key: string) => void
  registerTab: (key: string, el: HTMLElement | null, isActive: boolean) => void
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
  value?: string
  onChange?: (value: string) => void
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

  const isRouteActive = useIsRouteActive(to)
  const localMatch =
    to !== undefined ? isRouteActive : ctx.controlledValue === value

  const key = (to ?? value)!

  const isActive = ctx.activeKey === key

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
