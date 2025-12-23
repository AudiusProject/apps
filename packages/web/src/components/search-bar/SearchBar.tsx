import { ChangeEvent, KeyboardEvent } from 'react'

import { Status } from '@audius/common/models'
import { IconSearch, Tooltip } from '@audius/harmony'
import cn from 'classnames'
import Lottie from 'lottie-react'

import loadingSpinner from 'assets/animations/loadingSpinner.json'

import styles from './SearchBar.module.css'

interface SearchBarProps {
  className?: string
  iconClassname?: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  value: string
  onSearch: (text: string) => void
  placeholder: string
  tooltipText?: string
  headerText?: string
  showHeader?: boolean
  beginSearch?: () => void
  closeOnBlur?: boolean
  status?: Status
  shouldAutoFocus?: boolean
}

const DetailIcon = ({
  isLoading,
  tooltipText
}: {
  isLoading: boolean
  tooltipText?: string
}) => {
  return isLoading ? (
    <div className={styles.spinnerContainer}>
      <Lottie loop autoplay animationData={loadingSpinner} />
    </div>
  ) : (
    <Tooltip text={tooltipText || ''}>
      <IconSearch className={cn(styles.iconSearch)} />
    </Tooltip>
  )
}

const SearchBar = ({
  className,
  iconClassname,
  open,
  value,
  onOpen,
  onClose,
  onSearch,
  placeholder,
  tooltipText,
  headerText,
  showHeader = true,
  closeOnBlur = false,
  beginSearch = () => ({}),
  status = Status.SUCCESS,
  shouldAutoFocus = true
}: SearchBarProps) => {
  const onBlur = () => {
    if (closeOnBlur || value === '') {
      onClose()
    }
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value)
  }

  const handleClick = () => {
    if (open) {
      if (value.trimLeft() !== '') {
        beginSearch()
      } else {
        onSearch('')
        onClose()
      }
    } else {
      onOpen()
    }
  }

  const handleKeyPress = ({ key }: KeyboardEvent<HTMLDivElement>) => {
    if (key === 'Enter' && value.trimLeft() !== '') beginSearch()
  }

  return (
    <div
      className={cn(styles.searchBar, className, {
        [styles.open]: open
      })}
    >
      {showHeader && <div className={styles.header}>{headerText || ''}</div>}
      <input
        autoFocus={open && shouldAutoFocus}
        className={styles.searchInput}
        placeholder={open ? placeholder : ''}
        value={open ? value : ''}
        onChange={onChange}
        onKeyPress={handleKeyPress}
        onBlur={onBlur}
        {...(open ? {} : { disabled: true })}
      />

      <div
        className={cn(styles.searchWrapper, iconClassname)}
        onMouseDown={handleClick}
      >
        <DetailIcon
          tooltipText={tooltipText}
          isLoading={status === Status.LOADING && open}
        />
      </div>
    </div>
  )
}

export default SearchBar
