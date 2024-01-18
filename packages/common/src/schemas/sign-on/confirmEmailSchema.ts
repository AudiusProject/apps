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
  // Remove non-numeric characters
  const numericOnly = inputString.replace(/\D/g, '')

  // Limit the string to 6 characters
  const limitedString = numericOnly.slice(0, 6)

  // Insert a space after the third character if the string is more than three characters long
  const formattedString = limitedString.replace(
    /^(.{3})(.{0,3})$/,
    (_, firstThree, rest) => (rest ? `${firstThree} ${rest}` : firstThree)
  )

  return formattedString
}

export { messages as confirmEmailErrorMessages }
