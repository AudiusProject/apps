import { describe, it, expect } from 'vitest'

import { FixedDecimal } from './FixedDecimal'

describe('FixedDecimal', function () {
  describe('constructor', function () {
    it('constructs properly using bigint', function () {
      expect(
        new FixedDecimal(
          BigInt('1234567890123456789012345678901234567890')
        ).toString()
      ).toBe('1234567890123456789012345678901234567890')
    })

    it('constructs properly using negative bigint', function () {
      expect(
        new FixedDecimal(
          BigInt('-1234567890123456789012345678901234567890')
        ).toString()
      ).toBe('-1234567890123456789012345678901234567890')
    })

    it('constructs properly using bigint and decimal places', function () {
      expect(
        new FixedDecimal(
          BigInt('1234567890123456789012345678901234567890'),
          10
        ).toString()
      ).toBe('123456789012345678901234567890.1234567890')
    })

    it('constructs properly using string', function () {
      expect(new FixedDecimal('123.456').toString()).toBe('123.456')
    })

    it('constructs properly using negative string', function () {
      expect(new FixedDecimal('-123.456').toString()).toBe('-123.456')
    })

    it('constructs properly using string and decimal places', function () {
      expect(new FixedDecimal('123.456').toString()).toBe('123.456')
    })

    it('constructs properly using number', function () {
      expect(new FixedDecimal(123.456).toString()).toBe('123.456')
    })

    it('constructs properly using negative number', function () {
      expect(new FixedDecimal(-123.456).toString()).toBe('-123.456')
    })

    it('constructs properly using another FixedDecimal', function () {
      expect(new FixedDecimal(new FixedDecimal(1, 3)).toString()).toBe('1.000')
    })

    it('constructs properly using another negative FixedDecimal', function () {
      expect(new FixedDecimal(new FixedDecimal(-1, 3)).toString()).toBe(
        '-1.000'
      )
    })

    it('constructs properly using another FixedDecimal and decimal places', function () {
      expect(new FixedDecimal(new FixedDecimal(1, 3), 10).toString()).toBe(
        '1.0000000000'
      )
    })

    it('constructs properly using scientific notation (negative exp)', function () {
      expect(new FixedDecimal(0.1234567890123456).toString()).toBe(
        '0.1234567890123456'
      )
      expect(new FixedDecimal(1.234567890123456e-20).toString()).toBe(
        '0.00000000000000000001234567890123456'
      )
      expect(new FixedDecimal(-1.234567890123456e-4, 5).toString()).toBe(
        '-0.00012'
      )
    })

    it('constructs properly using scientific notation (positive exp)', function () {
      expect(new FixedDecimal(10000000000000000).toString()).toBe(
        '10000000000000000'
      )
      expect(new FixedDecimal(1.234567890123456e20).toString()).toBe(
        '123456789012345600000'
      )
      expect(new FixedDecimal(-1.234567890123456e4, 2).toString()).toBe(
        '-12345.67'
      )
    })

    it('throws if using NaN', function () {
      expect(() => new FixedDecimal(NaN).toString()).toThrow(
        'Number must be finite'
      )
    })

    it('throws if using infinite number', function () {
      expect(() =>
        new FixedDecimal(Number.POSITIVE_INFINITY).toString()
      ).toThrow('Number must be finite')
    })

    it('throws if using bad string', function () {
      expect(() => new FixedDecimal('hello').toString()).toThrow()
    })
  })
  describe('floor', function () {
    it('floors positive decimals correctly', function () {
      expect(new FixedDecimal(1.2345).floor().toString()).toBe('1.0000')
    })

    it('floors negative decimals correctly', function () {
      expect(new FixedDecimal(-1.2345).floor().toString()).toBe('-2.0000')
    })

    it('floors 0 correctly', function () {
      expect(new FixedDecimal(0, 3).floor().toString()).toBe('0.000')
    })

    it('floors whole numbers correctly', function () {
      expect(new FixedDecimal(4, 3).floor().toString()).toBe('4.000')
    })

    it('floors no-op correctly', function () {
      expect(new FixedDecimal(BigInt(-100000), 6).floor(2).toString()).toBe(
        '-0.100000'
      )
    })

    it('floors large numbers correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .floor()
          .toString()
      ).toBe('12345678901234567890.00000000000000000000')
    })

    it('floors tiny numbers correctly', function () {
      expect(new FixedDecimal(BigInt('1'), 20).floor().toString()).toBe(
        '0.00000000000000000000'
      )
    })

    it('floors to arbitrary decimal places correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .floor(2)
          .toString()
      ).toBe('12345678901234567890.99000000000000000000')
    })

    it('flooring carries', function () {
      expect(new FixedDecimal('-999.5').round().toString()).toBe('-1000.0')
    })

    it('throws when decimal places are out of range', function () {
      expect(() =>
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .floor(50)
          .toString()
      ).toThrow('Digits must be non-negative')
    })

    it('floors to zero if decimal places is beyond number', function () {
      expect(new FixedDecimal(BigInt('12345'), 3).floor(-10).toString()).toBe(
        '0.000'
      )
    })
  })

  describe('ceil', function () {
    it('ceils positive decimals correctly', function () {
      expect(new FixedDecimal(1.2345).ceil().toString()).toBe('2.0000')
    })

    it('ceils negative decimals correctly', function () {
      expect(new FixedDecimal(-1.2345).ceil().toString()).toBe('-1.0000')
    })
    it('ceils 0 correctly', function () {
      expect(new FixedDecimal(0, 3).ceil().toString()).toBe('0.000')
    })

    it('ceils whole numbers correctly', function () {
      expect(new FixedDecimal(4, 3).ceil().toString()).toBe('4.000')
    })

    it('ceils large numbers correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .ceil()
          .toString()
      ).toBe('12345678901234567891.00000000000000000000')
    })

    it('ceils tiny numbers correctly', function () {
      expect(new FixedDecimal(BigInt('1'), 20).ceil().toString()).toBe(
        '1.00000000000000000000'
      )
    })

    it('ceils to arbitrary decimal places correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789000000000000000000001'), 20)
          .ceil(2)
          .toString()
      ).toBe('12345678901234567890.01000000000000000000')
    })

    it('ceiling carries', function () {
      expect(new FixedDecimal('999.5').round().toString()).toBe('1000.0')
    })

    it('throws when decimal places are out of range', function () {
      expect(() =>
        new FixedDecimal(BigInt('1234567890123456789000000000000000000001'), 20)
          .ceil(50)
          .toString()
      ).toThrow('Digits must be non-negative')
    })

    it('ceils to 1s place of represented place if decimal places is beyond number', function () {
      expect(new FixedDecimal(BigInt('12345'), 3).ceil(-10).toString()).toBe(
        '10000000000.000'
      )
    })
  })

  describe('trunc', function () {
    it('truncs positive decimals correctly', function () {
      expect(new FixedDecimal(1.2345).trunc().toString()).toBe('1.0000')
    })

    it('truncs negative decimals correctly', function () {
      expect(new FixedDecimal(-1.2345).trunc().toString()).toBe('-1.0000')
    })

    it('truncs 0 correctly', function () {
      expect(new FixedDecimal(0, 3).trunc().toString()).toBe('0.000')
    })

    it('truncs whole numbers correctly', function () {
      expect(new FixedDecimal(4, 3).trunc().toString()).toBe('4.000')
    })

    it('truncs large numbers correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .trunc()
          .toString()
      ).toBe('12345678901234567890.00000000000000000000')
    })

    it('truncs tiny numbers correctly', function () {
      expect(new FixedDecimal(BigInt('1'), 20).trunc().toString()).toBe(
        '0.00000000000000000000'
      )
    })

    it('truncs to arbitrary decimal places correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .trunc(2)
          .toString()
      ).toBe('12345678901234567890.99000000000000000000')
    })

    it('throws when decimal places are out of range', function () {
      expect(() =>
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .trunc(50)
          .toString()
      ).toThrow('Digits must be non-negative')
    })

    it('truncs to 1s place of represented place if decimal places is beyond number', function () {
      expect(new FixedDecimal(BigInt('12345'), 3).trunc(-10).toString()).toBe(
        '0.000'
      )
    })
  })

  describe('round', function () {
    it('rounds up positive numbers when appropriate', function () {
      expect(new FixedDecimal('1234.5678').round(2).toString()).toBe(
        '1234.5700'
      )
      expect(new FixedDecimal('1234.5678').round().toString()).toBe('1235.0000')
    })

    it('rounds down positive numbers when appropriate', function () {
      expect(new FixedDecimal('8765.4321').round(2).toString()).toBe(
        '8765.4300'
      )
      expect(new FixedDecimal('8765.4321').round().toString()).toBe('8765.0000')
    })

    it('rounds up negative numbers when appropriate', function () {
      expect(new FixedDecimal('-1234.5678').round(2).toString()).toBe(
        '-1234.5700'
      )
      expect(new FixedDecimal('-1234.5678').round().toString()).toBe(
        '-1235.0000'
      )
    })

    it('rounds down negative numbers when appropriate', function () {
      expect(new FixedDecimal('-8765.4321').round(2).toString()).toBe(
        '-8765.4300'
      )
      expect(new FixedDecimal('-8765.4321').round().toString()).toBe(
        '-8765.0000'
      )
    })

    it('rounds to 0 if decimal places is far beyond number significance', function () {
      expect(new FixedDecimal('1').round(-20).toString()).toBe('0')
      expect(new FixedDecimal('841580.000').round(-20).toString()).toBe('0.000')
    })

    it('rounds to 1 if decimal places is beyond number by one place and leads with 5 or greater', function () {
      expect(new FixedDecimal('5').round(-1).toString()).toBe('10')
      expect(new FixedDecimal('841580.000').round(-6).toString()).toBe(
        '1000000.000'
      )
    })

    it('rounding carries', function () {
      expect(new FixedDecimal('999.5').round().toString()).toBe('1000.0')
      expect(new FixedDecimal('-999.5').round().toString()).toBe('-1000.0')
    })

    it('throws when decimal places are out of range', function () {
      expect(() => new FixedDecimal('1').round(20)).toThrow(
        'Digits must be non-negative'
      )
    })
  })

  describe('expand', function () {
    it('expands positive decimals correctly', function () {
      expect(new FixedDecimal(1.2345).expand().toString()).toBe('2.0000')
    })

    it('expands negative decimals correctly', function () {
      expect(new FixedDecimal(-1.2345).expand().toString()).toBe('-2.0000')
    })

    it('expands 0 correctly', function () {
      expect(new FixedDecimal(0, 3).expand().toString()).toBe('0.000')
    })

    it('expands whole numbers correctly', function () {
      expect(new FixedDecimal(4, 3).expand().toString()).toBe('4.000')
    })

    it('expands large numbers correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .expand()
          .toString()
      ).toBe('12345678901234567891.00000000000000000000')
    })

    it('expands tiny numbers correctly', function () {
      expect(new FixedDecimal(BigInt('1'), 20).expand().toString()).toBe(
        '1.00000000000000000000'
      )
    })

    it('expands to arbitrary decimal places correctly', function () {
      expect(
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .expand(2)
          .toString()
      ).toBe('12345678901234567891.00000000000000000000')
    })

    it('throws when decimal places are out of range', function () {
      expect(() =>
        new FixedDecimal(BigInt('1234567890123456789099999999999999999999'), 20)
          .expand(50)
          .toString()
      ).toThrow('Digits must be non-negative')
    })

    it('expands to 1s place of represented place if decimal places is beyond number', function () {
      expect(new FixedDecimal(BigInt('12345'), 3).expand(-10).toString()).toBe(
        '10000000000.000'
      )
    })
  })

  describe('toPrecision', function () {
    it('work on positive numbers', function () {
      expect(new FixedDecimal('1234.56789').toPrecision(7)).toBe('1234.56700')
    })

    it('works on negative numbers', function () {
      expect(new FixedDecimal('-1234.56789').toPrecision(7)).toBe('-1234.56700')
    })

    it('works when precision is more than the number of digits', function () {
      expect(new FixedDecimal('-1234.56789').toPrecision(15)).toBe(
        '-1234.56789000000'
      )
    })

    it('works when precision is less than the number of decimal places', function () {
      expect(new FixedDecimal('-1234.56789').toPrecision(2)).toBe('-1200.00000')
    })

    it('works on whole numbers when precision is less than digits', function () {
      expect(new FixedDecimal('123').toPrecision(2)).toBe('120')
    })

    it('works on whole numbers when precision is more than digits', function () {
      expect(new FixedDecimal('123').toPrecision(6)).toBe('123.000')
    })
  })

  describe('toFixed', function () {
    it('rounds up positive numbers when appropriate', function () {
      expect(new FixedDecimal('1234.5678').toFixed(2)).toBe('1234.57')
      expect(new FixedDecimal('1234.5678').toFixed()).toBe('1235')
    })

    it('rounds down positive numbers when appropriate', function () {
      expect(new FixedDecimal('8765.4321').toFixed(2)).toBe('8765.43')
      expect(new FixedDecimal('8765.4321').toFixed()).toBe('8765')
    })

    it('rounds up negative numbers when appropriate', function () {
      expect(new FixedDecimal('-1234.5678').toFixed(2)).toBe('-1234.57')
      expect(new FixedDecimal('-1234.5678').toFixed()).toBe('-1235')
    })

    it('rounds down negative numbers when appropriate', function () {
      expect(new FixedDecimal('-8765.4321').toFixed(2)).toBe('-8765.43')
      expect(new FixedDecimal('-8765.4321').toFixed()).toBe('-8765')
    })

    it('has no decimal places when called without args', function () {
      expect(new FixedDecimal('1', 5).toFixed()).toBe('1')
    })

    it('has as many decimal places as specified', function () {
      expect(new FixedDecimal('1', 5).toFixed(3)).toBe('1.000')
    })

    it('adds additional decimal places if beyond the precision of the FixedDecimal', function () {
      expect(new FixedDecimal('1').toFixed(3)).toBe('1.000')
    })

    it('throws when using negative decimal places', function () {
      expect(() => new FixedDecimal('1').toFixed(-1)).toThrow(
        'decimalPlaces must be non-negative'
      )
    })
  })

  describe('toShorthand', function () {
    it('shows zero correctly', function () {
      expect(new FixedDecimal('0.00000').toShorthand()).toBe('0')
    })

    it('shows values between zero and one correctly', function () {
      expect(new FixedDecimal('0.042').toShorthand()).toBe('0.04')
    })

    it('shows whole numbers correctly', function () {
      expect(new FixedDecimal('1234').toShorthand()).toBe('1234')
    })

    it('trunctes to whole numbers correctly', function () {
      expect(new FixedDecimal('8.0099').toShorthand()).toBe('8')
    })

    it('shows negative numbers correctly', function () {
      expect(new FixedDecimal('-8.0099').toShorthand()).toBe('-8')
    })

    it('shows decimal numbers correctly', function () {
      expect(new FixedDecimal('12.345').toShorthand()).toBe('12.34')
    })

    it('shows trailing zero if necessary', function () {
      expect(new FixedDecimal('12.301').toShorthand()).toBe('12.30')
      expect(new FixedDecimal('12.30').toShorthand()).toBe('12.30')
    })

    it('shows thousands correctly', function () {
      expect(new FixedDecimal('9999.9999').toShorthand()).toBe('9999.99')
    })

    it('shows ten thousands correctly', function () {
      expect(new FixedDecimal('10000.9999').toShorthand()).toBe('10K')
    })

    it('shows hundred thousands correctly', function () {
      expect(new FixedDecimal('443123.9999').toShorthand()).toBe('443K')
    })

    it('shows negative numbers correctly', function () {
      expect(new FixedDecimal('-10000.88882').toShorthand()).toBe('-10K')
      expect(new FixedDecimal('-9999.99').toShorthand()).toBe('-9999.99')
    })
  })

  describe('toLocaleString', function () {
    it('defaults to include all decimals', function () {
      expect(new FixedDecimal('1.23456789').toLocaleString('en-US')).toBe(
        '1.23456789'
      )
    })

    it('defaults to group with commas', function () {
      expect(new FixedDecimal('123456789').toLocaleString('en-US')).toBe(
        '123,456,789'
      )
    })

    it('does not group with commas when grouping turned off', function () {
      expect(
        new FixedDecimal('123456789').toLocaleString('en-US', {
          useGrouping: false
        })
      ).toBe('123456789')
    })

    it('defaults to group with commas and include all decimals', function () {
      expect(
        new FixedDecimal('123456789.123456789').toLocaleString('en-US')
      ).toBe('123,456,789.123456789')
    })

    it('shows minimumFractionDigits', function () {
      expect(
        new FixedDecimal('1').toLocaleString('en-US', {
          minimumFractionDigits: 2
        })
      ).toBe('1.00')
      expect(
        new FixedDecimal('0', 5).toLocaleString('en-US', {
          minimumFractionDigits: 2
        })
      ).toBe('0.00')
    })

    it('does not show minimumFractionDigits when trailingZeroDisplay is stripIfInteger and decimal part is 0', function () {
      expect(
        new FixedDecimal('1.0', 5).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          trailingZeroDisplay: 'stripIfInteger'
        })
      ).toBe('1')
    })

    it('truncates by default when maximumFractionDigit is set', function () {
      expect(
        new FixedDecimal('1.005').toLocaleString('en-US', {
          maximumFractionDigits: 2
        })
      ).toBe('1')
      expect(
        new FixedDecimal('-1.005').toLocaleString('en-US', {
          maximumFractionDigits: 2
        })
      ).toBe('-1')
    })

    it('truncates when configured to and maximumFractionDigit is set', function () {
      expect(
        new FixedDecimal('1.005').toLocaleString('en-US', {
          roundingMode: 'trunc',
          maximumFractionDigits: 2
        })
      ).toBe('1')
      expect(
        new FixedDecimal('-1.005').toLocaleString('en-US', {
          roundingMode: 'trunc',
          maximumFractionDigits: 2
        })
      ).toBe('-1')
    })

    it('ceils when configured to and maximumFractionDigit is set', function () {
      expect(
        new FixedDecimal('1.005').toLocaleString('en-US', {
          roundingMode: 'ceil',
          maximumFractionDigits: 2
        })
      ).toBe('1.01')
      expect(
        new FixedDecimal('-1.005').toLocaleString('en-US', {
          roundingMode: 'ceil',
          maximumFractionDigits: 2
        })
      ).toBe('-1')
    })

    it('floors when configured to and maximumFractionDigit is set', function () {
      expect(
        new FixedDecimal('1.005').toLocaleString('en-US', {
          roundingMode: 'floor',
          maximumFractionDigits: 2
        })
      ).toBe('1')
      expect(
        new FixedDecimal('-1.005').toLocaleString('en-US', {
          roundingMode: 'floor',
          maximumFractionDigits: 2
        })
      ).toBe('-1.01')
    })

    it('rounds when configured to and maximumFractionDigit is set', function () {
      expect(
        new FixedDecimal('1.005').toLocaleString('en-US', {
          roundingMode: 'halfExpand',
          maximumFractionDigits: 2
        })
      ).toBe('1.01')
      expect(
        new FixedDecimal('-1.005').toLocaleString('en-US', {
          roundingMode: 'halfExpand',
          maximumFractionDigits: 2
        })
      ).toBe('-1.01')
    })

    it('uses proper grouping and separator for Germany', function () {
      expect(
        new FixedDecimal('123456789.123456789').toLocaleString('de-DE')
      ).toBe('123.456.789,123456789')
    })

    it('uses proper grouping and separator for France', function () {
      expect(
        new FixedDecimal('123456789.123456789').toLocaleString('fr-FR')
      ).toBe('123 456 789,123456789')
    })

    it('uses proper grouping and separator for Switzerland', function () {
      expect(
        new FixedDecimal('123456789.123456789').toLocaleString('de-CH')
      ).toBe('123’456’789.123456789')
    })

    it('uses proper grouping and separator for India', function () {
      expect(
        new FixedDecimal('123456789.123456789').toLocaleString('en-IN')
      ).toBe('12,34,56,789.123456789')
    })

    it('formats zero correctly', function () {
      expect(
        new FixedDecimal(0, 6).toLocaleString('en-US', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
          trailingZeroDisplay: 'stripIfInteger'
        })
      ).toBe('0')
    })

    it('handles fractional negatives correctly', function () {
      expect(new FixedDecimal('-0.123').toLocaleString('en-US')).toBe('-0.123')
    })
  })
})
