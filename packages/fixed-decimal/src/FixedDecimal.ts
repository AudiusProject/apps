import { NoBrand } from './utilityTypes.js'

/**
 * Parses a string into the constructor args for a {@link FixedDecimal}.
 *
 * Doesn't do any validation of the string - if it's malformed the `BigInt`
 * construction will fail.
 * @param value The value represented as a fixed decimal string.
 * @param decimalPlaces The number of decimal places the result should have.
 * @returns
 */
const parseFixedDecimalString = <T extends bigint>(
  value: string,
  decimalPlaces?: number
): FixedDecimalCtorArgs<T> => {
  // Expand scientific notation using strings
  if (value.includes('e')) {
    const [coefficient, exponent] = value.split('e')
    const exp = parseInt(exponent, 10)
    if (exp > 0) {
      let [cWhole, cDecimal] = coefficient.split('.')
      cDecimal = cDecimal ?? ''
      const whole = cWhole + cDecimal.substring(0, exp)
      const decimal = cDecimal.substring(exp)
      value = decimal.length > 0 ? `${whole}.${decimal}` : whole
    }
    if (exp < 0) {
      let [cWhole, cDecimal] = coefficient.split('.')
      cDecimal = cDecimal ?? ''
      value = '0.' + cWhole.padStart(-exp, '0') + cDecimal
    }
  }

  let [whole, decimal] = value.split('.')
  decimal = decimal ?? ''
  if (decimalPlaces !== undefined) {
    decimal = decimal.padEnd(decimalPlaces, '0').substring(0, decimalPlaces)
  }
  return {
    value: BigInt(`${whole}${decimal}`) as T,
    decimalPlaces: decimalPlaces ?? decimal.length
  }
}

type FixedDecimalCtorArgs<T extends bigint> = {
  value: T
  decimalPlaces: number
}

/**
 * A custom options type for the custom toLocaleString() implementation of
 * {@link FixedDecimal} that only allows the supported subset of the
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat Intl.NumberFormat options}.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat MDN documentation for Intl.NumberFormat}
 */
type FixedDecimalFormatOptions = Omit<
  BigIntToLocaleStringOptions,
  'minimumFractionDigits' | 'maximumFractionDigits'
> & {
  /**
   * Whether to use grouping separators, such as thousands separators or thousand/lakh/crore separators.
   *
   * Note: Does not support `'always'`, `'auto'`, or `'min2'`
   * @defaultValue `true`
   */
  useGrouping?: boolean
  /**
   * The minimum number of fraction digits to use.
   * @defaultValue `0`
   */
  minimumFractionDigits?: number
  /**
   * The maximum number of fraction digits to use.
   * @defaultValue `this.decimalPlaces` (include all decimal places)
   */
  maximumFractionDigits?: number
  /**
   * How decimals should be rounded.
   *
   * Possible values are:
   *
   * `'ceil'`
   *    > Round toward +∞. Positive values round up.
   *      Negative values round "more positive".
   *
   * `'floor'`
   *    > Round toward -∞. Positive values round down.
   *      Negative values round "more negative".
   *
   * `'trunc'` (default)
   *    > Round toward 0. This _magnitude_ of the value is always
   *      reduced by rounding. Positive values round down.
   *      Negative values round "less negative".
   *
   * `'halfExpand'`
   *    > Ties away from 0. Values above the half-increment round away from
   *      zero, and below towards 0. Does what Math.round() does.
   *
   * `'expand'`
   *    > round away from 0. The magnitude of the value is always increased by
   *      rounding. Positive values round up.
   *      Negative values round "more negative".
   *
   * Note: Does not support `'halfCeil'`, `'halfFloor'`, `'halfTrunc'`
   * or `'halfEven'`
   * @defaultValue `'trunc'`
   */
  roundingMode?: 'ceil' | 'floor' | 'trunc' | 'halfExpand' | 'expand'
  /**
   * The strategy for displaying trailing zeros on whole numbers.
   *
   * Possible values are:
   *
   * `'auto'` (default)
   *    > Keep trailing zeros according to minimumFractionDigits and
   *      minimumSignificantDigits.
   *
   * `'stripIfInteger'`
   *    > Remove the fraction digits if they are all zero. This is the same as
   *      "auto" if any of the fraction digits is non-zero.
   *
   * @defaultValue `'auto'`
   */
  trailingZeroDisplay?: 'auto' | 'stripIfInteger'
}

/**
 * Gets the default formatting options for toLocalString() for a given {@link FixedDecimal}.
 *
 * Noticable differences from {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#moreprecision Intl.NumberFormat}:
 * - `maximumFractionDigits` is the total number of digits, not `3`.
 * - `roundingMode` is `'trunc'`.
 *
 * @param value the fixed decimal to format
 *
 * @see {@link FixedDecimalFormatOptions}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#moreprecision MDN Documentation for Intl.NumberFormat}
 */
const getDefaultFormatOptions = (value: FixedDecimal) =>
  ({
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: value.decimalPlaces,
    roundingMode: 'trunc',
    trailingZeroDisplay: 'auto'
  }) as const

/**
 * A data structure for fixed precision decimals.
 *
 * @summary
 * `FixedDecimal` uses a `BigInt` and the number of decimal digits to represent
 * a fixed precision decimal number. It's useful for representing currency,
 * especially cryptocurrency, as the underlying `BigInt` can handle the large
 * amounts while keeping exact precision.
 *
 * Unlike `BigDecimal` or `BigNumber` solutions elsewhere, `FixedDecimal`
 * is not intended to be persisted and arithmetically operated on, but
 * rather used ephemerally for normalizing and formatting. Almost all of
 * its methods are chainable to make it convenient to initialize a
 * `FixedDecimal`, operate on it, and immediately get back a string
 * or `bigint` representation. If you find yourself wanting to do
 * arithmetic with two `FixedDecimal`s, consider using `BigInt`s instead and
 * using `FixedDecimal` as the last step to format into a decimal.
 *
 * @example
 * // Math on values. Make sure the decimalPlaces are the same!
 * const a = new FixedDecimal(1, 5)
 * const b = new FixedDecimal(2, 5)
 * a.value + b.value // 300000n
 *
 * @example
 * // Automatically formats to fixed precision decimal strings
 * new FixedDecimal(1, 3).toString() // '1.000'
 *
 * @example
 * // Represent fractional dollars and round to cents
 * new FixedDecimal(1.32542).toFixed(2) // '1.33'
 */
export class FixedDecimal<BigIntBrand extends bigint = bigint> {
  public value: BigIntBrand
  public decimalPlaces: number
  private _defaultFormatOptions: FixedDecimalFormatOptions

  /**
   * Constructs a {@link FixedDecimal}.
   *
   * If `decimalPlaces` is not specified, the number of decimals is inferred.
   *
   * If `value` is a {@link FixedDecimal}, converts to the new amount of
   * decimals, changing precision. Precision data loss may occur.
   *
   * @param value The value to be represented.
   * @param decimalPlaces The number of decimal places the value has.
   */
  constructor(
    value:
      | FixedDecimalCtorArgs<bigint>
      | BigIntBrand
      | NoBrand<bigint>
      | number
      | string,
    decimalPlaces?: number,
    defaultFormatOptions: FixedDecimalFormatOptions = {}
  ) {
    switch (typeof value) {
      case 'number': {
        if (!Number.isFinite(value)) {
          throw new Error('Number must be finite')
        }
        const parsed = parseFixedDecimalString<BigIntBrand>(
          value.toString(),
          decimalPlaces
        )
        this.value = parsed.value
        this.decimalPlaces = parsed.decimalPlaces
        break
      }
      case 'string': {
        const parsed = parseFixedDecimalString<BigIntBrand>(
          value,
          decimalPlaces
        )
        this.value = parsed.value
        this.decimalPlaces = parsed.decimalPlaces
        break
      }
      case 'object': {
        if (value instanceof FixedDecimal) {
          const parsed = parseFixedDecimalString<BigIntBrand>(
            value.toString(),
            decimalPlaces
          )
          this.value = parsed.value
          this.decimalPlaces = parsed.decimalPlaces
        } else if ('value' in value) {
          this.value = value.value as BigIntBrand
          this.decimalPlaces = value.decimalPlaces
        } else {
          throw new Error('Invalid object type for FixedDecimal constructor')
        }
        break
      }
      default:
        this.value = value as BigIntBrand
        this.decimalPlaces = decimalPlaces ?? 0
    }
    this._defaultFormatOptions = {
      ...getDefaultFormatOptions(this),
      ...defaultFormatOptions
    }
  }

  /**
   * Math.ceil() but for {@link FixedDecimal}.
   * @param decimalPlaces The number of decimal places ceil to.
   * @returns A new {@link FixedDecimal} with the result for chaining.
   */
  public ceil(decimalPlaces?: number) {
    const digits = this.decimalPlaces - (decimalPlaces ?? 0)
    return this._ceil(digits)
  }

  private _ceil(digitsToRemove: number) {
    if (digitsToRemove < 0) {
      throw new RangeError('Digits must be non-negative')
    }
    const divisor = BigInt(10 ** digitsToRemove)
    const bump = this.value % divisor > 0 ? BigInt(1) : BigInt(0)
    return new FixedDecimal<BigIntBrand>({
      value: ((this.value / divisor + bump) * divisor) as BigIntBrand,
      decimalPlaces: this.decimalPlaces
    })
  }

  /**
   * Math.floor() but for {@link FixedDecimal}.
   * @param decimalPlaces The number of decimal places to floor to.
   * @returns A new {@link FixedDecimal} with the result for chaining.
   */
  public floor(decimalPlaces?: number) {
    const digits = this.decimalPlaces - (decimalPlaces ?? 0)
    return this._floor(digits)
  }

  private _floor(digitsToRemove: number) {
    if (digitsToRemove < 0) {
      throw new RangeError('Digits must be non-negative')
    }
    const divisor = BigInt(10 ** digitsToRemove)
    // Subtract one if negative w/ remainder
    if (this.value < 0 && this.value % divisor !== BigInt(0)) {
      return new FixedDecimal<BigIntBrand>({
        value: ((this.value / divisor) * divisor - divisor) as BigIntBrand,
        decimalPlaces: this.decimalPlaces
      })
    }
    // Truncate otherwise
    return new FixedDecimal<BigIntBrand>({
      value: ((this.value / divisor) * divisor) as BigIntBrand,
      decimalPlaces: this.decimalPlaces
    })
  }

  /**
   * Math.trunc() but for {@link FixedDecimal}.
   * @param decimalPlaces The number of decimal places to truncate to.
   * @returns A new {@link FixedDecimal} with the result for chaining.
   */
  public trunc(decimalPlaces?: number) {
    const digits = this.decimalPlaces - (decimalPlaces ?? 0)
    return this._trunc(digits)
  }

  private _trunc(digitsToRemove: number) {
    if (digitsToRemove < 0) {
      throw new RangeError('Digits must be non-negative')
    }
    const divisor = BigInt(10 ** digitsToRemove)
    return new FixedDecimal<BigIntBrand>({
      value: ((this.value / divisor) * divisor) as BigIntBrand,
      decimalPlaces: this.decimalPlaces
    })
  }

  /**
   * Math.round() but for {@link FixedDecimal}.
   * @param decimalPlaces The number of decimal places to round to.
   * @returns A new {@link FixedDecimal} with the result for chaining.
   */
  public round(decimalPlaces?: number) {
    const digits = this.decimalPlaces - (decimalPlaces ?? 0)
    return this._round(digits)
  }

  private _round(digitsToRemove: number) {
    if (digitsToRemove < 0) {
      throw new RangeError('Digits must be non-negative')
    }
    const signMultiplier = this.value > 0 ? BigInt(1) : BigInt(-1)
    // Divide to get the test digit in the ones place
    const divisor = BigInt(10 ** (digitsToRemove - 1))
    let quotient = this.value / divisor
    // Round the tens digit by adding or subtracting 5
    quotient += signMultiplier * BigInt(5)
    // Divide by 10 to remove the rounding test digit
    quotient /= BigInt(10)
    // Multiply by the original divisor and 10 to get the number of digits back
    return new FixedDecimal<BigIntBrand>({
      value: (quotient * divisor * BigInt(10)) as BigIntBrand,
      decimalPlaces: this.decimalPlaces
    })
  }

  /**
   * Rounds away from zero. (Opposite of trunc())
   * @param decimalPlaces The number of decimal places to round to.
   * @returns A new {@link FixedDecimal} with the result for chaining.
   */
  public expand(decimalPlaces?: number) {
    const digits = this.decimalPlaces - (decimalPlaces ?? 0)
    return this._expand(digits)
  }

  private _expand(digitsToRemove: number) {
    if (digitsToRemove < 0) {
      throw new RangeError('Digits must be non-negative')
    }
    const divisor = BigInt(10 ** digitsToRemove)
    const remainder = this.value % divisor
    // If whole number, do nothing
    if (remainder === BigInt(0)) {
      return this
    }
    const signMultiplier = this.value > 0 ? BigInt(1) : BigInt(-1)
    // If not, truncate and add/sub 1 to the place we're rounding to
    return new FixedDecimal<BigIntBrand>({
      value: ((this.value / divisor) * divisor +
        divisor * signMultiplier) as BigIntBrand,
      decimalPlaces: this.decimalPlaces
    })
  }

  /**
   * Number.toPrecision() but for {@link FixedDecimal}.
   * @param significantDigits The number of significant digits to keep.
   * @returns The number truncated to the significant digits specified as a string.
   */
  public toPrecision(significantDigits: number) {
    const signOffset = this.value < 0 ? 1 : 0
    const digitsToRemove =
      this.value.toString().length - significantDigits - signOffset
    const hasDecimalPoint = this.decimalPlaces > 0
    const addDecimalPoint = !hasDecimalPoint && digitsToRemove < 0
    const decimalOffset = hasDecimalPoint || addDecimalPoint ? 1 : 0
    const str = this._trunc(Math.max(digitsToRemove, 0)).toString()
    return `${str}${addDecimalPoint ? '.' : ''}`.padEnd(
      significantDigits + decimalOffset + signOffset,
      '0'
    )
  }

  /**
   * Number.toFixed() but for {@link FixedDecimal}.
   * @param decimalPlaces The number of decimal places to show.
   * @returns The number rounded to the decimal places specifed as a string.
   */
  public toFixed(decimalPlaces?: number) {
    const decimalCount = decimalPlaces ?? 0
    if (decimalCount < 0) {
      throw new RangeError('decimalPlaces must be non-negative')
    }
    const d =
      decimalCount > this.decimalPlaces ? this : this.round(decimalCount)
    const [whole, decimalOrUndefined] = d.toString().split('.')
    const decimal = (decimalOrUndefined ?? '').padEnd(decimalCount + 1, '0')
    const decimalTruncated = decimal.substring(0, decimalCount)
    return decimalCount > 0 ? `${whole}.${decimalTruncated}` : whole
  }

  /**
   * Represents the {@link FixedDecimal} as a fixed decimal string by inserting the
   * decimal point in the appropriate spot and padding any needed zeros.
   *
   * Not to be used for UI purposes.
   *
   * @see {@link toLocaleString} for UI appropriate strings.
   */
  public toString() {
    const str = this.value
      .toString()
      // temp remove "-" to allow padding the decimal
      .replace('-', '')
      // ensure there's enough padding to include "-0.{decimal part}"
      .padStart(this.decimalPlaces + 1, '0')
    return `${this.value < 0 ? '-' : ''}${
      this.decimalPlaces > 0
        ? `${str.substring(0, str.length - this.decimalPlaces)}.${str.substring(
            str.length - this.decimalPlaces
          )}`
        : str
    }`
  }

  /**
   * Analogous to Number().toLocaleString(), with some important differences in
   * the options available and the defaults. Be sure to check the defaults.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat Mozilla NumberFormat documentation}
   *
   * @param locale The string specifying the locale (default is 'en-US').
   * @param options The options for formatting. The available options and defaults are different than NumberFormat.
   */
  public toLocaleString(locale?: string, options?: FixedDecimalFormatOptions) {
    // Apply defaults
    const mergedOptions = {
      ...this._defaultFormatOptions,
      ...options
    }
    // Apply rounding method
    let str = ''
    switch (mergedOptions.roundingMode) {
      case 'ceil':
        str = this.ceil(mergedOptions.maximumFractionDigits).toString()
        break
      case 'floor':
        str = this.floor(mergedOptions.maximumFractionDigits).toString()
        break
      case 'trunc':
        str = this.trunc(mergedOptions.maximumFractionDigits).toString()
        break
      case 'halfExpand':
        str = this.round(mergedOptions.maximumFractionDigits).toString()
        break
      case 'expand':
        str = this.expand(mergedOptions.maximumFractionDigits).toString()
        break
    }

    let [whole, decimal] = str.split('.')

    // Strip trailing zeros
    decimal = (decimal ?? '').replace(/0+$/, '')

    if (mergedOptions.minimumFractionDigits !== undefined) {
      if (
        mergedOptions.trailingZeroDisplay !== 'stripIfInteger' ||
        BigInt(decimal) !== BigInt(0)
      ) {
        decimal = decimal.padEnd(mergedOptions.minimumFractionDigits, '0')
      }
    }

    // Localize with a decimal to extract the separator
    const wholeInt = BigInt(whole.replace('-', ''))
    whole = wholeInt.toLocaleString(locale, {
      ...mergedOptions,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })

    // Annoyingly, React Native doesn't respect minimumFractionDigits for
    // bigint formatting. Instead, get the decimalSeparator from a Number.
    const decimalSeparator = Number(0).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })[1]

    return (
      (this.value < 0 ? '-' : '') +
      (decimal.length > 0 ? `${whole}${decimalSeparator}${decimal}` : whole)
    )
  }

  /**
   * Formats the decimal as an easy-to-read shorthand summary.
   * Used primarily for balances in tiles and headers.
   *
   * - Always truncates, never rounds up. (eg. `1.9999 => "1.99"`)
   * - Don't show decimal places if they'd appear as 0. (eg. `1.00234 => "1"`)
   * - Shows two decimal places if they'd be non-zero. (eg. `1.234 => "1.23"`)
   * - Count by 1,000s if over 10k (eg. `25413 => "25k"`)
   *
   * @example
   * new FixedDecimal(0, 5).toShorthand() // "0"
   * new FixedDecimal(8, 5).toShorthand() // "8"
   * new FixedDecimal(8.01, 5).toShorthand() // "8.01"
   * new FixedDecimal(8.1, 5).toShorthand() // "8.10"
   * new FixedDecimal(4210, 5).toShorthand() // "4210"
   * new FixedDecimal(9999.99, 5).toShorthand() // "9999.99"
   * new FixedDecimal(56001.43, 5).toShorthand() // "56K"
   * new FixedDecimal(443123.23, 5).toShorthand() // "443K"
   */
  public toShorthand() {
    if (this.value === BigInt(0)) {
      return '0'
    }
    const signMultiplier = this.value > 0 ? BigInt(1) : BigInt(-1)
    const divisor = BigInt(10 ** this.decimalPlaces)
    const quotient = this.value / divisor
    if (quotient * signMultiplier >= 10000) {
      return `${quotient / BigInt(1000)}K`
    } else if (this.value % divisor === BigInt(0)) {
      return quotient.toString()
    } else {
      const amountString = this.value
        .toString()
        .padStart(this.decimalPlaces, '0')
      const decimalStart = amountString.length - this.decimalPlaces
      // Get the first two decimals (truncated)
      const decimal = amountString.substring(decimalStart, decimalStart + 2)
      if (decimal === '00') {
        return quotient.toString()
      }
      return `${quotient}.${decimal}`
    }
  }
}
