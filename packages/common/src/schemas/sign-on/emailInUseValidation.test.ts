import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { emailInUseErrorMessages } from '~/api/tan-query/users/useEmailInUse'
import type { QueryContextType } from '~/api/tan-query/utils'

import { emailSchema, emailSchemaMessages } from './emailSchema'
import { signInErrorMessages, signInSchema } from './signInSchema'

const checkIfEmailRegistered = vi.fn()
const queryContext = {
  identityService: { checkIfEmailRegistered }
} as unknown as QueryContextType

const httpError = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status }
  })

let queryClient: QueryClient

beforeEach(() => {
  checkIfEmailRegistered.mockReset()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
})

const validateSignIn = (email: string) =>
  toFormikValidationSchema(signInSchema(queryContext, queryClient)).validate({
    email,
    password: 'password'
  })

const validateEmail = (email: string) =>
  toFormikValidationSchema(emailSchema(queryContext, queryClient)).validate({
    email
  })

describe('signInSchema', () => {
  it('does not look up an incomplete email', async () => {
    await expect(validateSignIn('dyl')).rejects.toMatchObject({
      inner: [{ path: 'email', message: signInErrorMessages.email }]
    })
    expect(checkIfEmailRegistered).not.toHaveBeenCalled()
  })

  it('shows a rate limit error instead of throwing on 429', async () => {
    checkIfEmailRegistered.mockRejectedValue(httpError(429))
    await expect(validateSignIn('user@audius.co')).rejects.toMatchObject({
      name: 'ValidationError',
      inner: [{ path: 'email', message: emailInUseErrorMessages.rateLimited }]
    })
  })

  it('shows a generic error when the lookup fails', async () => {
    checkIfEmailRegistered.mockRejectedValue(httpError(500))
    await expect(validateSignIn('user@audius.co')).rejects.toMatchObject({
      name: 'ValidationError',
      inner: [
        {
          path: 'email',
          message: emailInUseErrorMessages.somethingWentWrong
        }
      ]
    })
  })

  it('flags guest accounts', async () => {
    checkIfEmailRegistered.mockResolvedValue({ exists: true, isGuest: true })
    await expect(validateSignIn('user@audius.co')).rejects.toMatchObject({
      inner: [
        { path: 'email', message: signInErrorMessages.guestAccountExists }
      ]
    })
  })

  it('passes for an existing account', async () => {
    checkIfEmailRegistered.mockResolvedValue({ exists: true, isGuest: false })
    await expect(validateSignIn('user@audius.co')).resolves.toBeUndefined()
    expect(checkIfEmailRegistered).toHaveBeenCalledWith('user@audius.co')
  })
})

describe('emailSchema', () => {
  it('does not look up an incomplete email', async () => {
    await expect(validateEmail('user@audius.c')).rejects.toMatchObject({
      name: 'ValidationError'
    })
    expect(checkIfEmailRegistered).not.toHaveBeenCalled()
  })

  it('shows a rate limit error instead of throwing on 429', async () => {
    checkIfEmailRegistered.mockRejectedValue(httpError(429))
    await expect(validateEmail('user@audius.co')).rejects.toMatchObject({
      name: 'ValidationError',
      inner: [{ path: 'email', message: emailInUseErrorMessages.rateLimited }]
    })
  })

  it('flags an email that is already taken', async () => {
    checkIfEmailRegistered.mockResolvedValue({ exists: true, isGuest: false })
    await expect(validateEmail('user@audius.co')).rejects.toMatchObject({
      inner: [{ path: 'email', message: emailSchemaMessages.emailInUse }]
    })
  })

  it('passes for a new email', async () => {
    checkIfEmailRegistered.mockResolvedValue({ exists: false, isGuest: false })
    await expect(validateEmail('user@audius.co')).resolves.toBeUndefined()
  })
})
