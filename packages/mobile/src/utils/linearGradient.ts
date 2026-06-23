import type { LinearGradientPoint } from 'app/harmony-native/components/LinearGradient/LinearGradient'

/**
 * Converts a `react-native-linear-gradient` `angle` (bearing degrees: 0 points
 * up, increasing clockwise) into our `LinearGradient` `start`/`end` points,
 * expressed as fractions of the gradient box.
 *
 * `react-native-linear-gradient` anchored the gradient line to the box corners.
 * We anchor it to the center instead, which preserves the gradient *direction*
 * for every angle — the only visible difference is on diagonal angles over
 * strongly non-square boxes, where the corner-anchored version stretched the
 * color band slightly. `angleCenter` was always the default `{ x: 0.5, y: 0.5 }`
 * at our call sites, so it is intentionally not parameterized here.
 */
export const getGradientStartEnd = (
  angle: number
): { start: LinearGradientPoint; end: LinearGradientPoint } => {
  const radians = (angle * Math.PI) / 180
  const dx = Math.sin(radians) / 2
  const dy = Math.cos(radians) / 2
  return {
    start: { x: 0.5 - dx, y: 0.5 + dy },
    end: { x: 0.5 + dx, y: 0.5 - dy }
  }
}
