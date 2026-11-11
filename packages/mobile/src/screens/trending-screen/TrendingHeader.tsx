import type { ComponentType, ReactNode } from 'react'

import { TimeRange } from '@audius/common/models'
import type { Modals, TrendingCategory } from '@audius/common/store'
import {
  modalsActions,
  trendingPageActions,
  trendingPageSelectors
} from '@audius/common/store'
import { ALL_GENRES } from '@audius/common/utils'
import type { ViewStyle } from 'react-native'
import { View } from 'react-native'
import type { SvgProps } from 'react-native-svg'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, IconLeading, SelectablePill } from '@audius/harmony-native'
import { GradientIcon, GradientText } from 'app/components/core'
import type { StylesProp } from 'app/styles'
import { makeStyles } from 'app/styles'

const { getTrendingCategory } = trendingPageSelectors
const { setTrendingCategory } = trendingPageActions
const { setVisibility } = modalsActions

const categoryLabels: Record<TrendingCategory, string> = {
  tracks: 'Tracks',
  underground: 'Underground',
  winners: 'Winners'
}

const categories: TrendingCategory[] = ['tracks', 'underground', 'winners']

type TrendingHeaderProps = {
  title: string
  icon: ComponentType<SvgProps>
  filterModal: Modals
  /** When false, only the category pills are shown (title row is in native header) */
  showTitleRow?: boolean
  styles?: StylesProp<{ root: ViewStyle }>
  /** `small` for the compact copy under the collapsed header pill. */
  size?: 'small' | 'large'
  /** Extra controls after the category pills. */
  children?: ReactNode
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  // No backgroundColor: `FloatingSubHeader` owns the fill.
  root: {
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight8,
    elevation: 3,
    shadowColor: palette.neutralDark1,
    shadowOpacity: 0.12,
    shadowOffset: { height: 2, width: 0 },
    shadowRadius: 2
  },
  rootNoBorders: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: spacing(4)
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerIcon: {
    marginRight: spacing(2)
  },
  header: {
    fontSize: typography.fontSize.xl,
    lineHeight: 25,
    fontFamily: typography.fontByWeight.heavy
  },
  pillsContainer: {
    paddingHorizontal: spacing(4)
  }
}))

export const TrendingHeader = (props: TrendingHeaderProps) => {
  const {
    title,
    icon: Icon,
    filterModal,
    showTitleRow = true,
    styles: stylesProp,
    size = 'large',
    children
  } = props
  const styles = useStyles()
  const dispatch = useDispatch()
  const category = useSelector(getTrendingCategory) ?? 'tracks'
  const timeRange = useSelector(trendingPageSelectors.getTrendingTimeRange)
  const genre = useSelector(trendingPageSelectors.getTrendingGenre)

  const hasActiveFilters =
    (timeRange ?? TimeRange.WEEK) !== TimeRange.WEEK ||
    (genre ?? ALL_GENRES) !== ALL_GENRES

  const handleOpenFilter = () => {
    dispatch(setVisibility({ modal: filterModal, visible: true }))
  }

  const handleCategoryChange = (value: string, isSelected: boolean) => {
    const newCategory = isSelected ? (value as TrendingCategory) : 'tracks'
    dispatch(setTrendingCategory(newCategory))
    // No lineup reset needed — tanquery re-fetches when the active time
    // range + genre change.
  }

  const rootStyle = showTitleRow
    ? [styles.root, stylesProp?.root]
    : [styles.root, styles.rootNoBorders, stylesProp?.root]

  return (
    <View style={rootStyle}>
      {showTitleRow ? (
        <View style={styles.titleRow}>
          <View style={styles.headerContent}>
            <GradientIcon
              icon={Icon as ComponentType<SvgProps>}
              height={20}
              style={styles.headerIcon}
            />
            <GradientText accessibilityRole='header' style={styles.header}>
              {title}
            </GradientText>
          </View>
          {category === 'tracks' ? (
            <Flex>
              <SelectablePill
                type='button'
                icon={IconLeading}
                size='large'
                isSelected={hasActiveFilters}
                isControlled
                onPress={handleOpenFilter}
                accessibilityLabel='Open filter'
              />
            </Flex>
          ) : null}
        </View>
      ) : null}
      <Flex
        direction='row'
        alignItems='center'
        gap='s'
        style={showTitleRow ? styles.pillsContainer : undefined}
      >
        {categories.map((cat) => (
          <SelectablePill
            key={cat}
            type='radio'
            size={size}
            value={cat}
            label={categoryLabels[cat]}
            isSelected={category === cat}
            onChange={handleCategoryChange}
            disableUnselectAnimation
          />
        ))}
        {children}
      </Flex>
    </View>
  )
}
