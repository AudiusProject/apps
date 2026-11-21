import {
  UseResizeColumnsColumnOptions,
  UseResizeColumnsColumnProps,
  UseResizeColumnsOptions,
  UseResizeColumnsState,
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByHooks,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState
} from 'react-table'

declare module 'react-table' {
  export interface TableOptions<D extends Record<string, unknown>>
    extends UseResizeColumnsOptions<D>,
      UseSortByOptions<D>,
      Record<string, any> {}

  export interface Hooks<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseSortByHooks<D> {}

  export interface TableInstance<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseSortByInstanceProps<D> {}

  export interface TableState<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseResizeColumnsState<D>,
      UseSortByState<D> {}

  interface CustomColumn {
    align?: 'right' | 'left'
    accessor?: string
    sortTitle?: string
  }

  export interface ColumnInterface<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseSortByColumnOptions<D>,
      UseResizeColumnsColumnOptions<D>,
      CustomColumn {}

  export interface ColumnInstance<
    D extends Record<string, unknown> = Record<string, unknown>
  > extends UseResizeColumnsColumnProps<D>,
      UseSortByColumnProps<D>,
      CustomColumn {}

  export interface Cell<
    // D extends Record<string, unknown> = Record<string, unknown>,
    // V = any
  > {}

  export interface Row<
    // D extends Record<string, unknown> = Record<string, unknown>
  > {}
  // UseRowSelectRowProps<D>,
  // UseRowStateRowProps<D>,
  // UseExpandedRowProps<D>,
  // UseGroupByRowProps<D> {}
}
