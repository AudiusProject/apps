import { forwardRef, useCallback, useRef, useState, MouseEvent } from 'react'

import { useTheme } from '@emotion/react'
import cn from 'classnames'

import { Box } from '../layout/Box'
import { Flex } from '../layout/Flex'
import { Popup } from '../popup'

import { PopupMenuItem, PopupMenuProps } from './types'

/**
 * A menu that shows on top of the UI. Ideal for overflow menus, dropdowns, etc
 */
export const PopupMenu = forwardRef<HTMLDivElement, PopupMenuProps>(
  function PopupMenu(props, ref) {
    const {
      items,
      onClose,
      renderMenu,
      renderTrigger,
      dismissOnMouseLeave,
      hideCloseButton,
      title,
      className,
      zIndex,
      containerRef,
      anchorOrigin,
      transformOrigin,
      id,
      fixed,
      overrideIconColor
    } = props

    const { spacing, typography, color } = useTheme()
    const clickInsideRef = useRef<any>(null)
    const anchorRef = useRef<HTMLElement>(null)

    const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false)

    const triggerPopup = useCallback(
      (onMouseEnter?: boolean) => {
        if (onMouseEnter && isPopupVisible) return
        setIsPopupVisible(!isPopupVisible)
      },
      [isPopupVisible, setIsPopupVisible]
    )

    const handlePopupClose = useCallback(() => {
      setIsPopupVisible(false)
      if (onClose) onClose()
    }, [setIsPopupVisible, onClose])

    const handleMenuItemClick = useCallback(
      (item: PopupMenuItem) => (e: MouseEvent<HTMLElement>) => {
        e.stopPropagation()
        item.onClick(e)
        handlePopupClose()
      },
      [handlePopupClose]
    )

    const triggerId = id ? `${id}-trigger` : undefined

    const triggerProps = {
      'aria-controls': isPopupVisible ? id : undefined,
      'aria-haspopup': true,
      'aria-expanded': isPopupVisible ? ('true' as const) : undefined,
      id: triggerId
    }

    const popupCss = {
      margin: spacing.s,
      padding: spacing.s,
      border: `1px solid ${color.border.strong}`
    }

    const menuItemCss = {
      fontSize: typography.size.m,
      fontWeight: typography.weight.demiBold,
      color: color.text.default,
      cursor: 'pointer',
      '&:hover': {
        color: color.text.white,
        background: color.secondary.s300,
        path: {
          fill: color.icon.white
        }
      },
      '&.destructive': {
        color: color.status.error,
        '&:hover': {
          background: color.status.error,
          color: color.icon.white
        }
      }
    }

    const iconCss = {
      path: {
        fill: overrideIconColor ? undefined : color.text.default
      }
    }

    return (
      <Box ref={clickInsideRef}>
        {renderTrigger(anchorRef, triggerPopup, triggerProps)}
        <Popup
          anchorRef={anchorRef}
          checkIfClickInside={(target: EventTarget) => {
            if (target instanceof Element && clickInsideRef) {
              return clickInsideRef.current.contains(target)
            }
            return false
          }}
          isVisible={isPopupVisible}
          showHeader={Boolean(title)}
          hideCloseButton={hideCloseButton}
          onClose={handlePopupClose}
          ref={ref}
          title={title ?? ''}
          zIndex={zIndex}
          containerRef={containerRef}
          transformOrigin={transformOrigin}
          anchorOrigin={anchorOrigin}
          className={className}
          css={popupCss}
          dismissOnMouseLeave={dismissOnMouseLeave}
          fixed={fixed}
        >
          {renderMenu ? (
            renderMenu(items)
          ) : (
            <Box
              as='ul'
              role='menu'
              aria-labelledby={triggerId}
              tabIndex={-1}
              css={{ all: 'unset' }}
            >
              {items.map((item, i) => (
                <Flex
                  as='li'
                  key={typeof item.text === 'string' ? item.text : i}
                  role='menuitem'
                  className={cn(item.className, {
                    destructive: item.destructive
                  })}
                  onClick={handleMenuItemClick(item)}
                  tabIndex={i === 0 ? 0 : -1}
                  css={menuItemCss}
                  alignItems='center'
                  gap='s'
                  p='s'
                  ph='m'
                  borderRadius='s'
                >
                  {item.icon ? (
                    <Flex
                      css={iconCss}
                      className={item.iconClassName}
                      alignItems='center'
                      justifyContent='center'
                      w='unit5'
                      h='unit5'
                    >
                      {item.icon}
                    </Flex>
                  ) : null}
                  {item.text}
                </Flex>
              ))}
            </Box>
          )}
        </Popup>
      </Box>
    )
  }
)
