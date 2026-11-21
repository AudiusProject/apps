import { useTheme } from '@audius/harmony'
import { ClassNames } from '@emotion/react'
import { SetOptional } from 'type-fest'

import { Droppable, DroppableProps } from 'components/dragndrop'
import { selectDragnDropState } from 'store/dragndrop/slice'
import { useSelector } from 'utils/reducer'

type LeftNavDroppableProps = SetOptional<
  DroppableProps,
  'hoverClassName' | 'activeClassName' | 'inactiveClassName'
>

export const LeftNavDroppable = (props: LeftNavDroppableProps) => {
  const { kind } = useSelector(selectDragnDropState)
  const theme = useTheme()

  return (
    <ClassNames>
      {({ css, cx }) => (
        <Droppable
          className={css({
            width: '100%',
            position: 'relative',
            '::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: theme.color.background.accent,
              transition: `opacity ${theme.motion.quick}`,
              opacity: 0
            },
            '::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 20,
              height: 2,
              borderRadius: theme.cornerRadius.xs,
              backgroundColor: theme.color.background.accent,
              transition: `opacity ${theme.motion.expressive}`,
              opacity: 0,
              width: '70%'
            }
          })}
          hoverClassName={
            kind === 'track'
              ? css({
                  '::before': {
                    opacity: 0.15
                  }
                })
              : css({
                  '::after': {
                    opacity: 1
                  }
                })
          }
          activeClassName={
            kind === 'track'
              ? cx(
                  css({ '& > *': { color: theme.color.text.accent } }),
                  'droppableLinkActive'
                )
              : undefined
          }
          inactiveClassName={css({
            '& > *': { opacity: 0.6, cursor: 'not-allowed' }
          })}
          {...props}
        />
      )}
    </ClassNames>
  )
}
