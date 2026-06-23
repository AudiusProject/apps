import { z } from 'zod'

export const messages = {
  emailRequired: 'Please enter an email.',
  email: 'Please enter a valid email.',
  passwordRequired: 'Please enter a password.',
  invalidCredentials: 'Invalid credentials.'
}

export const signInSchema = () =>
  z.object({
    email: z
      .string({ required_error: messages.emailRequired })
      .email(messages.email),
    password: z.string({
      required_error: messages.passwordRequired
    })
  })

export { messages as signInErrorMessages }
