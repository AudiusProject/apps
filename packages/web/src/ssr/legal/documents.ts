// Keep these URLs aligned with the documents displayed by the public site.
export const legalDocuments: Record<
  string,
  { title: string; documentPath: string }
> = {
  '/legal/privacy-policy': {
    title: 'Privacy Policy',
    documentPath: '/documents/PrivacyPolicy.pdf'
  },
  '/legal/terms-of-use': {
    title: 'Terms of Use',
    documentPath: '/documents/TermsOfUse.pdf'
  },
  '/legal/api-terms': {
    title: 'API Terms',
    documentPath: '/documents/ApiTerms.pdf'
  },
  '/legal/fan-club-terms': {
    title: 'Fan Club Terms',
    documentPath: '/documents/FanClubTerms.pdf'
  },
  '/legal/fan-club-acceptable-use': {
    title: 'Fan Club Acceptable Use Policy',
    documentPath: '/documents/FanClubAcceptableUsePolicy.pdf'
  }
}
