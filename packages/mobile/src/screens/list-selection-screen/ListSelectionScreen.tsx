import type { ComponentType, ReactElement, ReactNode } from 'react'
import { useState } from 'react'

import type { Nullable } from '@audius/common/utils'
import type { ListRenderItem, ViewStyle } from 'react-native'
import { View } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import type { IconComponent } from '@audius/harmony-native'
import { Flex } from '@audius/harmony-native'
import { TextInput } from 'app/components/core'
import type { FormScreenProps } from 'app/screens/form-screen'
import { FormScreen } from 'app/screens/form-screen'
import { makeStyles } from 'app/styles'

import { SelectionItemList } from './SelectionItemList'

export type ListSelectionData = {
  label?: string
  value: string
  disabled?: boolean
  icon?: IconComponent
  leadingElement?: ReactElement
  labelLeadingElement?: ReactElement
}

export type ListSelectionProps = Partial<Omit<FormScreenProps, 'header'>> & {
  screenTitle: string
  icon?: ComponentType<SvgProps>
  data: ListSelectionData[]
  renderItem?: ListRenderItem<ListSelectionData>
  onChange: (value: any) => void
  value: string
  searchText?: string
  isLoading?: boolean
  disableSearch?: boolean
  allowDeselect?: boolean
  hideSelectionLabel?: boolean
  itemStyles?: ViewStyle
  itemContentStyles?: ViewStyle
  topbarLeft?: Nullable<ReactElement>
  header?: ReactNode
  footer?: ReactNode
}

const useStyles = makeStyles(({ spacing, typography }) => ({
  root: {
    justifyContent: 'space-between'
  },
  content: { flex: 1 },
  noFlex: { flex: undefined },
  searchInput: {
    paddingVertical: spacing(3),
    fontSize: typography.fontSize.large
  }
}))

export const ListSelectionScreen = (props: ListSelectionProps) => {
  const {
    screenTitle,
    icon,
    renderItem,
    data,
    onChange,
    value,
    searchText = '',
    isLoading = false,
    disableSearch = false,
    allowDeselect = true,
    hideSelectionLabel = false,
    itemStyles,
    itemContentStyles,
    topbarLeft,
    header,
    footer,
    ...other
  } = props

  const styles = useStyles()
  const [filterInput, setFilterInput] = useState('')
  const filterRegexp = new RegExp(filterInput, 'ig')
  const filteredData = [...data].filter(
    ({ label, value }) =>
      label?.match(filterRegexp) || value?.match(filterRegexp)
  )

  return (
    <FormScreen
      title={screenTitle}
      icon={icon}
      variant='white'
      style={styles.root}
      topbarLeft={topbarLeft}
      {...other}
    >
      <View style={[styles.content, footer ? styles.noFlex : undefined]}>
        {header ? <Flex p='l'>{header}</Flex> : null}
        {disableSearch ? null : (
          <Flex p='l'>
            <TextInput
              placeholder={searchText}
              styles={{ input: styles.searchInput }}
              onChangeText={setFilterInput}
              returnKeyType='search'
            />
          </Flex>
        )}
        <SelectionItemList
          onChange={onChange}
          value={value}
          isLoading={isLoading}
          renderItem={renderItem}
          allowDeselect={allowDeselect}
          hideSelectionLabel={hideSelectionLabel}
          itemStyles={itemStyles}
          itemContentStyles={itemContentStyles}
          data={filteredData}
        />
        {footer}
      </View>
    </FormScreen>
  )
}
