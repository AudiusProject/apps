import React from 'react'
import CodeSamples from '@theme/CodeSamples'

/**
 * Compatibility wrapper for legacy ResponseSamples usage.
 * Maps responseExample + language to CodeSamples.
 */
export default function ResponseSamples({ responseExample, language }) {
  return <CodeSamples example={responseExample} language={language || 'json'} />
}
