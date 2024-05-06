import { ReactNode, useContext, useEffect, useState } from 'react'

import {
  Tag,
  Radio,
  RadioGroupContext,
  Text,
  IconComponent,
  Hint,
  IconQuestionCircle
} from '@audius/harmony'
import { ResizeObserver } from '@juggle/resize-observer'
import cn from 'classnames'
import useMeasure from 'react-use-measure'

import layoutStyles from 'components/layout/layout.module.css'

import styles from './ModalRadioItem.module.css'

type ModalRadioItemProps = {
  label: string
  title?: ReactNode
  description?: ReactNode
  hintContent?: string | ReactNode
  hintIcon?: IconComponent
  tag?: string
  value: any
  disabled?: boolean
  icon?: ReactNode
  checkedContent?: ReactNode
}

export const ModalRadioItem = (props: ModalRadioItemProps) => {
  const {
    icon,
    label,
    hintContent,
    hintIcon = IconQuestionCircle,
    tag,
    title,
    description,
    value,
    disabled,
    checkedContent
  } = props
  const [isCollapsed, setIsCollapsed] = useState(true)
  const radioGroup = useContext(RadioGroupContext)

  const [ref, bounds] = useMeasure({
    polyfill: ResizeObserver,
    offsetSize: true
  })

  useEffect(() => {
    if (radioGroup) {
      const isChecked = String(value) === String(radioGroup.value)
      if (isCollapsed === isChecked) {
        setIsCollapsed(!isChecked)
      }
    }
  }, [radioGroup, isCollapsed, value, setIsCollapsed])

  return (
    <label
      className={cn(styles.root, layoutStyles.col, layoutStyles.gap2, {
        [styles.disabled]: disabled
      })}
    >
      <div className={cn(layoutStyles.row, layoutStyles.gap4)}>
        <Radio
          aria-label={label}
          value={value}
          disabled={disabled}
          inputClassName={styles.input}
        />
        <Text className={styles.optionTitle} variant='title' size='l'>
          {icon}
          <span>{title ?? label}</span>
        </Text>
        {tag ? <Tag className={styles.tag}>{tag}</Tag> : null}
      </div>
      {hintContent ? <Hint icon={hintIcon}>{hintContent}</Hint> : null}
      {checkedContent || description ? (
        <div
          className={cn(styles.collapsibleContainer, {
            [styles.collapsed]: isCollapsed
          })}
          style={{ height: isCollapsed ? 0 : bounds.height }}
          aria-hidden={isCollapsed}
        >
          <div ref={ref} className={cn(layoutStyles.col, layoutStyles.gap4)}>
            {typeof description === 'string' ? (
              <Text variant='body'>{description}</Text>
            ) : (
              description
            )}
            {checkedContent}
          </div>
        </div>
      ) : null}
    </label>
  )
}
