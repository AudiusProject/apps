import type { ReactElement } from 'react'
import { useCallback } from 'react'

import type { ListRenderItem, ViewStyle } from 'react-native'
import { TouchableOpacity, View, FlatList } from 'react-native'

import type { IconComponent } from '@audius/harmony-native'
import { Divider, Flex, Text } from '@audius/harmony-native'
import { RadioButton } from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import { makeStyles } from 'app/styles'

type ListItemData = {
  label?: string
  value: string
  icon?: IconComponent
  disabled?: boolean
  leadingElement?: ReactElement
}

type SelectionItemListProps = {
  data: ListItemData[]
  value?: string
  onChange?: (value: any) => void
  allowDeselect?: boolean
  hideSelectionLabel?: boolean
  isLoading?: boolean
  itemStyles?: ViewStyle
  itemContentStyles?: ViewStyle
  renderItem?: ListRenderItem<ListItemData>
  footerComponent?: ReactElement
}

const defaultRenderItem: ListRenderItem<ListItemData> = ({ item }) => {
  const { label, icon: Icon, value, leadingElement } = item

  const title = <Text>{label ?? value}</Text>

  if (Icon || leadingElement) {
    return (
      <Flex direction='row' alignItems='center' gap='s'>
        {leadingElement}
        {Icon ? <Icon /> : null}
        {title}
      </Flex>
    )
  }

  return title
}

const messages = {
  loading: 'Loading...',
  selected: 'Selected'
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(4)
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  radio: {
    marginRight: spacing(4)
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  loadingText: {
    fontFamily: typography.fontByWeight.demiBold,
    fontSize: typography.fontSize.large,
    marginLeft: spacing(4)
  },
  loadingSpinnerView: {
    width: spacing(6),
    height: spacing(6)
  },
  loadingSpinner: {
    color: palette.neutral
  }
}))

export const SelectionItemList = ({
  allowDeselect,
  data,
  onChange,
  renderItem: renderItemProp = defaultRenderItem,
  value,
  hideSelectionLabel,
  itemStyles,
  itemContentStyles,
  isLoading,
  footerComponent
}: SelectionItemListProps) => {
  const styles = useStyles()

  const renderItem: ListRenderItem<ListItemData> = useCallback(
    (info) => {
      const { value: itemValue, disabled } = info.item
      const isSelected = value === itemValue

      const handleChange = () => {
        if (isSelected) {
          if (allowDeselect) onChange?.(null)
        } else {
          onChange?.(itemValue)
        }
      }

      if (disabled) {
        return (
          <View style={styles.listItem}>
            <View style={styles.listItemContent}>
              <RadioButton
                checked={isSelected}
                disabled={disabled}
                style={styles.radio}
              />
              {renderItemProp(info)}
            </View>
          </View>
        )
      }

      if (isSelected && !allowDeselect) {
        return (
          <View style={[styles.listItem, itemStyles]}>
            <View style={[styles.listItemContent, itemContentStyles]}>
              <RadioButton checked={isSelected} style={styles.radio} />
              {renderItemProp(info)}
            </View>
            {!hideSelectionLabel ? (
              <Text variant='body' color='accent'>
                {messages.selected}
              </Text>
            ) : null}
          </View>
        )
      }

      return (
        <TouchableOpacity
          style={[styles.listItem, itemStyles]}
          onPress={handleChange}
        >
          <View style={[styles.listItemContent, itemContentStyles]}>
            <RadioButton checked={isSelected} style={styles.radio} />
            {renderItemProp(info)}
          </View>
          {isSelected && !hideSelectionLabel ? (
            <Text variant='body' color='accent'>
              {messages.selected}
            </Text>
          ) : null}
        </TouchableOpacity>
      )
    },
    [
      renderItemProp,
      value,
      styles,
      onChange,
      allowDeselect,
      hideSelectionLabel,
      itemStyles,
      itemContentStyles
    ]
  )

  return isLoading ? (
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <View style={styles.loading}>
          <LoadingSpinner
            fill={styles.loadingSpinner.color}
            style={styles.loadingSpinnerView}
          />
          <Text style={styles.loadingText} numberOfLines={1}>
            {messages.loading}
          </Text>
        </View>
      </View>
    </View>
  ) : (
    <FlatList
      renderItem={renderItem}
      ItemSeparatorComponent={Divider}
      data={data}
      ListFooterComponent={footerComponent}
    />
  )
}
