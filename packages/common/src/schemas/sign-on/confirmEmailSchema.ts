import { z } from 'zod'

const messages = {
  required: 'Code required.',
  invalid: 'Invalid code.'
}

export const confirmEmailSchema = z.object({
  otp: z
    .string({ required_error: messages.required })
    .regex(/^\d{3} \d{3}$/, { message: messages.invalid })
})

export const formatOtp = (inputString: string) => {
  const numericOnly = inputString.replace(/\D/g, '')

  const limitedString = numericOnly.slice(0, 6)

  const formattedString = limitedString.replace(
    /^(.{3})(.{0,3})$/,
    (_, firstThree, rest) => (rest ? `${firstThree} ${rest}` : firstThree)
  )

  return formattedString
}

export { messages as confirmEmailErrorMessages }
