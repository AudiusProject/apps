import type BN from 'bn.js'

/**
 * @ignore
 * Parses a string into the constructor args for a {@link FixedDecimal}.
 *
 * Doesn't do any validation of the string - if it's malformed the `BigInt`
 * construction will fail.
 * @param value The value represented as a fixed decimal string.
 * @param decimalPlaces The number of decimal places the result should have.
 */
const parseFixedDecimalString = (
  value: string,
  decimalPlaces?: number
): FixedDecimalCtorArgs => {
  let [whole, decimal] = value.split('.')
  decimal = decimal ?? ''
  if (decimalPlaces !== undefined) {
    decimal = decimal.padEnd(decimalPlaces, '0').substring(0, decimalPlaces)
  }
  return {
    value: BigInt(`${whole}${decimal}`),
    decimalPlaces: decimalPlaces ?? decimal.length
  }
}

type FixedDecimalCtorArgs = {
  value: bigint
  decimalPlaces: number
}

/**
 * A custom options type for the custom toLocaleString() implementation of
 * {@link FixedDecimal} that only allows the supported subset of the
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat Intl.NumberFormat options}.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat MDN documentation for Intl.NumberFormat}
 * @see {@link defaultFormatOptions}
 */
type FormatOptions = {
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
   * Note: Does not support `'expand'`, `'halfCeil'`, `'halfFloor'`,
   * `'halfTrunc'` or `'halfEven'`
   * @defaultValue `'trunc'`
   */
  roundingMode?: 'ceil' | 'floor' | 'trunc' | 'halfExpand'
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
 * @ignore
 * Gets the default formatting options for toLocalString() for a given {@link FixedDecimal}.
 *
 * Noticable differences from {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#moreprecision Intl.NumberFormat}:
 * - `maximumFractionDigits` is the total number of digits, not `3`.
 * - `roundingMode` is `'trunc'`.
 *
 * @param value the fixed decimal to format
 *
 * @see {@link FormatOptions}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#moreprecision MDN Documentation for Intl.NumberFormat}
 */
const defaultFormatOptions = (value: FixedDecimal) =>
  ({
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: value.decimalPlaces,
    roundingMode: 'trunc',
    trailingZeroDisplay: 'auto'
  } as const)

/**
 * `FixedDecimal` uses a `BigInt` and the number of decimal digits to represent
 * a fixed precision decimal number. It's useful for representing currency,
 * especially cryptocurrency, as the underlying BigInt can handle the large
 * amounts while keeping exact precision.
 *
 * This class is not meant to be persisted and used in arithmetic. It's
 * intended to be convenience utilites for formatting large numbers
 * according to their decimal counts. If you find yourself wanting to do
 * arithmetic with two `FixedDecimal`s, consider using `BigInt` instead and
 * using `FixedDecimal` as the last step to format into a decimal.
 * As an escape hatch, you can access the underlying `BigInt` value.
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
 *
 * @see {@link AUDIO} for the Ethereum ERC-20 AUDIO token
 * @see {@link wAUDIO} for the Solana SPL "wrapped" AUDIO token
 * @see {@link SOL} for the Solana native SOL token
 * @see {@link USDC} for the Solana Circle USDC stablecoin token
 */
export class FixedDecimal {
  public readonly value: bigint
  public readonly decimalPlaces: number

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
    value: FixedDecimalCtorArgs | bigint | number | string | BN,
    decimalPlaces?: number
  ) {
    switch (typeof value) {
      case 'number': {
        if (!Number.isFinite(value)) {
          throw new Error('Number must be finite')
        }
        if (value.toString() === value.toExponential()) {
          throw new Error('Number must not be in scientific notation')
        }
        const parsed = parseFixedDecimalString(value.toString(), decimalPlaces)
        this.value = parsed.value
        this.decimalPlaces = parsed.decimalPlaces
        break
      }
      case 'string': {
        const parsed = parseFixedDecimalString(value, decimalPlaces)
        this.value = parsed.value
        this.decimalPlaces = parsed.decimalPlaces
        break
      }
      case 'object': {
        if (value instanceof FixedDecimal) {
          const parsed = parseFixedDecimalString(
            value.toString(),
            decimalPlaces
          )
          this.value = parsed.value
          this.decimalPlaces = parsed.decimalPlaces
        } else if ('value' in value) {
          this.value = value.value
          this.decimalPlaces = value.decimalPlaces
        } else {
          // Construct from BN.
          // Can't do `value instanceof BN` as the condition because BN is just
          // a type, instead get BN by elimination. Technically any object works
          // here that has a toString() that's a valid BigInt() arg.
          this.value = BigInt(value.toString())
          this.decimalPlaces = decimalPlaces ?? 0
        }
        break
      }
      default:
        this.value = value
        this.decimalPlaces = decimalPlaces ?? 0
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
    return new FixedDecimal({
      value: (this.value / divisor + bump) * divisor,
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
    const signOffset =
      this.value < 0 && digitsToRemove > 0
        ? BigInt(-1 * 10 ** digitsToRemove)
        : BigInt(0)
    return new FixedDecimal({
      value: (this.value / divisor) * divisor + signOffset,
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
    return new FixedDecimal({
      value: (this.value / divisor) * divisor,
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
    return new FixedDecimal(quotient * divisor * BigInt(10), this.decimalPlaces)
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
    const str = this.value.toString().padStart(this.decimalPlaces + 1, '0')
    return this.decimalPlaces > 0
      ? `${str.substring(0, str.length - this.decimalPlaces)}.${str.substring(
          str.length - this.decimalPlaces
        )}`
      : str
  }

  /**
   * Analogous to Number().toLocaleString(), with some important differences in
   * the options available and the defaults. Be sure to check the defaults.
   *
   * @see {@link defaultFormatOptions}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat Mozilla NumberFormat documentation}
   *
   * @param locale The string specifying the locale (default is 'en-US').
   * @param options The options for formatting. The available options and defaults are different than NumberFormat.
   */
  public toLocaleString(locale?: string, options?: FormatOptions) {
    // Apply defaults
    options = {
      ...defaultFormatOptions(this),
      ...options
    }
    // Apply rounding method
    let str = ''
    switch (options.roundingMode) {
      case 'ceil':
        str = this.ceil(options.maximumFractionDigits).toString()
        break
      case 'floor':
        str = this.floor(options.maximumFractionDigits).toString()
        break
      case 'trunc':
        str = this.trunc(options.maximumFractionDigits).toString()
        break
      case 'halfExpand':
        str = this.round(options.maximumFractionDigits).toString()
        break
    }

    let [whole, decimal] = str.split('.')

    // Strip trailing zeros
    decimal = (decimal ?? '').replace(/0+$/, '')

    if (options.minimumFractionDigits !== undefined) {
      if (
        options.trailingZeroDisplay !== 'stripIfInteger' ||
        BigInt(decimal) !== BigInt(0)
      ) {
        decimal = decimal.padEnd(options.minimumFractionDigits, '0')
      }
    }

    // Localize with a decimal to extract the separator
    const wholeInt = BigInt(whole)
    const wholeWithDecimal = wholeInt.toLocaleString(locale, {
      ...options,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
    // Get the separator character
    const decimalSeparator = wholeWithDecimal.substring(
      wholeWithDecimal.length - 2,
      wholeWithDecimal.length - 1
    )
    // Remove the decimal
    whole = wholeWithDecimal.substring(0, wholeWithDecimal.length - 2)
    return decimal.length > 0 ? `${whole}${decimalSeparator}${decimal}` : whole
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
    const divisor = BigInt(10 ** this.decimalPlaces)
    const quotient = this.value / divisor
    if (quotient >= 10000) {
      return `${quotient / BigInt(1000)}K`
    } else if (this.value % divisor === BigInt(0)) {
      return quotient.toString()
    } else {
      const amountString = this.value.toString()
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
