# @audius/fixed-decimal

## 0.2.1

### Patch Changes

- 0aef321: Allow scientific notation in constructor

## 0.2.0

### Minor Changes

- 1026ce1: Remove BN.js dependency

## 0.2.0

### Major Changes

- Remove BN.js support: The `FixedDecimal` constructor and currency constructors no longer accept BN.js instances. Use BigInt or string/number inputs instead. This eliminates the BN.js dependency and simplifies the API to focus on modern BigInt-based operations.

## 0.1.1

### Patch Changes

- 0a2fe3d: Add .js file extensions, and add package.json files to each dist w/ proper types to help node module resolution

## 0.1.0

### Minor Changes

- ebf9040: Add default formatting for toLocaleString to USDC, and support negative fractional numbers
- f365f01: Add support for "expand" rounding mode

### Patch Changes

- 04f810a: Fix floor for negative numbers with no remainder
