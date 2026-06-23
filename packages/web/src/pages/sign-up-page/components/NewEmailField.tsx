import { EmailField } from './EmailField'

type NewEmailFieldProps = {
  isGuestCheckout?: boolean
}

export const NewEmailField = (props: NewEmailFieldProps) => {
  const { isGuestCheckout } = props
  const emailFieldName = isGuestCheckout ? 'guestEmail' : 'email'

  return <EmailField name={emailFieldName} />
}
