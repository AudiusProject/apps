export function removeNullable<T>(
  value: T
): value is Exclude<T, false | null | undefined | '' | 0> {
  return Boolean(value)
}

export type NestedNonNullable<T> = {
  [P in keyof T]-?: NestedNonNullable<NonNullable<T[P]>>
}

export type Nullable<T> = T | null
export type DeepNullable<T> = {
  [K in keyof T]: DeepNullable<T[K]> | null
}
export type Overwrite<T, U extends keyof T, V> = Omit<T, U> & V
export type Maybe<T> = T | undefined

export type Brand<T, U extends string> = T & { _brand: U }

export type ValueOf<T> = T[keyof T]

export function isNullOrUndefined(obj: any): obj is null | undefined {
  return obj === null || obj === undefined
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type PickRename<
  Type,
  Key extends keyof Type,
  RenamedKey extends PropertyKey
> = Omit<Type, Key> & {
  [k in RenamedKey]: Type[Key]
}

export type DeepPartial<T> = T extends any[]
  ? T
  : T extends Set<any>
    ? T
    : T extends object
      ? {
          [P in keyof T]?: DeepPartial<T[P]>
        }
      : T

export type DeepOmit<T, K> = T extends object
  ? {
      [P in keyof T as P extends K ? never : P]: DeepOmit<T[P], K>
    }
  : T
