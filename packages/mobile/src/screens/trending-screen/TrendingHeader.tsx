import type { ComponentType } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { TimeRange } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import type { Modals, TrendingCategory } from '@audius/common/store'
import {
  modalsActions,
  trendingPageActions,
  trendingPageLineupActions,
  trendingPageSelectors
} from '@audius/common/store'
import { ALL_GENRES } from '@audius/common/utils'
import type { ViewStyle } from 'react-native'
import { ScrollView, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'
import { useDispatch, useSelector } from 'react-redux'

import {
  Flex,
  IconLeading,
  SelectablePill,
  useTheme
} from '@audius/harmony-native'
import { GradientIcon, GradientText } from 'app/components/core'
import type { StylesProp } from 'app/styles'
import { makeStyles } from 'app/styles'

const { getTrendingCategory } = trendingPageSelectors
const { setTrendingCategory } = trendingPageActions
const { setVisibility } = modalsActions
const { trendingWeekActions, trendingMonthActions, trendingAllTimeActions } =
  trendingPageLineupActions

const categoryLabels: Record<TrendingCategory, string> = {
  tracks: 'Tracks',
  underground: 'Underground',
  winners: 'Winners'
}

const baseCategories: TrendingCategory[] = ['tracks', 'underground']
const categoriesWithWinners: TrendingCategory[] = [...baseCategories, 'winners']

type TrendingHeaderProps = {
  title: string
  icon: ComponentType<SvgProps>
  filterModal: Modals
  /** When false, only the category pills are shown (title row is in native header) */
  showTitleRow?: boolean
  styles?: StylesProp<{ root: ViewStyle }>
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  root: {
    backgroundColor: palette.white,
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
    styles: stylesProp
  } = props
  const styles = useStyles()
  const { spacing } = useTheme()
  const dispatch = useDispatch()
  const { isEnabled: isTrendingWinnersEnabled } = useFeatureFlag(
    FeatureFlags.TRENDING_WINNERS
  )
  const category = useSelector(getTrendingCategory) ?? 'tracks'
  const timeRange = useSelector(trendingPageSelectors.getTrendingTimeRange)
  const genre = useSelector(trendingPageSelectors.getTrendingGenre)
  const categories = isTrendingWinnersEnabled
    ? categoriesWithWinners
    : baseCategories

  const hasActiveFilters =
    (timeRange ?? TimeRange.WEEK) !== TimeRange.WEEK ||
    (genre ?? ALL_GENRES) !== ALL_GENRES

  const handleOpenFilter = () => {
    dispatch(setVisibility({ modal: filterModal, visible: true }))
  }

  const handleCategoryChange = (value: string, isSelected: boolean) => {
    const newCategory = isSelected ? (value as TrendingCategory) : 'tracks'
    dispatch(setTrendingCategory(newCategory))
    if (newCategory !== 'winners') {
      dispatch(trendingWeekActions.reset())
      dispatch(trendingMonthActions.reset())
      dispatch(trendingAllTimeActions.reset())
    }
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.pillsContainer,
          { paddingVertical: spacing.s }
        ]}
      >
        <Flex direction='row' alignItems='center' gap='s'>
          {categories.map((cat) => (
            <SelectablePill
              key={cat}
              type='radio'
              size='large'
              value={cat}
              label={categoryLabels[cat]}
              isSelected={category === cat}
              onChange={handleCategoryChange}
              disableUnselectAnimation
            />
          ))}
        </Flex>
      </ScrollView>
    </View>
  )
}
