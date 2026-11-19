/**
 * Converts a #RGB, #RRGGBB or #RRGGBBAA hex color into the `rgb(r,g,b)`
 * form the players expect (see `shadeColor` and the twitter drop shadow in
 * `Card`, which both parse rgb strings). Alpha is dropped. Returns the
 * input unchanged when it isn't a hex color.
 */
export const hexToRgb = (hex) => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex ?? '')
  if (!match) return hex
  let digits = match[1]
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((d) => d + d)
      .join('')
  }
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16))
  return `rgb(${r},${g},${b})`
}
