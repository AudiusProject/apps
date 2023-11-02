export const motion = {
  quick: '0.07s ease-in-out',
  expressive: '0.18s ease-in-out',
  hover: '0.12s cubic-bezier(0.44, 0, 0.56, 1)',
  press: '0.12s cubic-bezier(0.44, 0, 0.56, 1)',
  calm: '0.5s ease-in-out'
}

export type Motion = typeof motion
export type MotionOptions = keyof Motion
