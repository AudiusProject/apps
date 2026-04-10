export type ResponsiveBreakpoint = {
  maxWidth: number
  hide: readonly string[]
}

export type ResponsiveColumns = {
  hideOrder?: readonly string[]
  alwaysVisibleIds?: readonly string[]
  breakpoints?: readonly ResponsiveBreakpoint[]
}

export type ColumnWithSize = {
  id?: string
  accessor?: string | ((...args: any[]) => any)
  width?: number
  minWidth?: number
  maxWidth?: number
}

type GetHiddenResponsiveColumnsArgs = {
  columns: ColumnWithSize[]
  containerWidth: number
  responsiveColumns: ResponsiveColumns
  fallbackColumnWidth: number
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const getColumnId = (column: ColumnWithSize) => {
  if (typeof column.id === 'string' && column.id.length > 0) return column.id
  if (typeof column.accessor === 'string' && column.accessor.length > 0) {
    return column.accessor
  }
  return null
}

export const getColumnBaseWidth = (
  column: ColumnWithSize,
  fallbackColumnWidth: number
) => {
  if (isNumber(column.width)) return column.width
  if (isNumber(column.maxWidth)) return column.maxWidth
  if (isNumber(column.minWidth)) return column.minWidth
  return fallbackColumnWidth
}

const getResponsiveBudgetWidth = (
  column: ColumnWithSize,
  fallbackColumnWidth: number
) => {
  if (isNumber(column.width) && isNumber(column.minWidth)) {
    return Math.max(column.width, column.minWidth)
  }
  if (isNumber(column.width)) return column.width
  if (isNumber(column.minWidth)) return column.minWidth
  if (isNumber(column.maxWidth)) return column.maxWidth
  return fallbackColumnWidth
}

export const getHiddenResponsiveColumns = ({
  columns,
  containerWidth,
  responsiveColumns,
  fallbackColumnWidth
}: GetHiddenResponsiveColumnsArgs) => {
  const alwaysVisible = new Set(responsiveColumns.alwaysVisibleIds ?? [])

  const breakpoints = responsiveColumns.breakpoints ?? []
  if (breakpoints.length > 0) {
    if (!isNumber(containerWidth) || containerWidth <= 0) {
      return new Set<string>()
    }

    const sortedBreakpoints = [...breakpoints].sort(
      (a, b) => a.maxWidth - b.maxWidth
    )
    const activeBreakpoint = sortedBreakpoints.find(
      (breakpoint) => containerWidth <= breakpoint.maxWidth
    )

    if (!activeBreakpoint) return new Set<string>()

    return new Set(
      activeBreakpoint.hide.filter((id) => !alwaysVisible.has(id))
    )
  }

  const hideOrder = responsiveColumns.hideOrder ?? []
  if (
    !hideOrder.length ||
    !isNumber(containerWidth) ||
    containerWidth <= 0
  ) {
    return new Set<string>()
  }

  const widthById = new Map<string, number>()
  let totalWidth = 0

  for (const column of columns) {
    const id = getColumnId(column)
    if (!id) continue
    const width = getResponsiveBudgetWidth(column, fallbackColumnWidth)
    widthById.set(id, width)
    totalWidth += width
  }

  if (totalWidth <= containerWidth) return new Set<string>()

  const hidden = new Set<string>()
  for (const id of hideOrder) {
    if (totalWidth <= containerWidth) break
    if (alwaysVisible.has(id)) continue
    const width = widthById.get(id)
    if (!isNumber(width) || hidden.has(id)) continue
    hidden.add(id)
    totalWidth -= width
  }

  return hidden
}
