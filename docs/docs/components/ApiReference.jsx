import { useEffect, useState } from 'react'

export default function ApiReference() {
  const [ScalarRef, setScalarRef] = useState(null)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    Promise.all([
      import('@scalar/api-reference-react'),
      import('@scalar/api-reference-react/style.css'),
    ]).then(([mod]) => {
      setScalarRef(() => mod.ApiReferenceReact)
    })
  }, [])

  // Vocs → Scalar: watch <html class="dark"> and push into Scalar via prop + localStorage
  useEffect(() => {
    const html = document.documentElement
    const syncFromVocs = () => {
      const isDark = html.classList.contains('dark')
      setDarkMode(isDark)
      localStorage.setItem('colorMode', isDark ? 'dark' : 'light')
    }
    syncFromVocs()
    const observer = new MutationObserver(syncFromVocs)
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Scalar → Vocs: watch document.body for dark-mode/light-mode classes
  useEffect(() => {
    const syncFromScalar = () => {
      const isDark = document.body.classList.contains('dark-mode')
      const isLight = document.body.classList.contains('light-mode')
      if (!isDark && !isLight) return
      document.documentElement.classList.toggle('dark', isDark)
    }
    const observer = new MutationObserver(syncFromScalar)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  if (!ScalarRef) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
        '--scalar-custom-header-height': 'var(--vocs-topNav_height, 60px)',
      }}
    >
      <ScalarRef
        configuration={{
          url: '/openapi.yaml',
          darkMode,
          operationTitleSource: 'path',
          showOperationId: true,
          authentication: {
            preferredSecurityScheme: 'OAuth2',
            securitySchemes: {
              OAuth2: {
                flows: {
                  authorizationCode: {
                    'x-usePkce': 'SHA-256',
                    selectedScopes: ['read'],
                    // Audius API key for the docs app
                    'x-scalar-client-id': '2cc593fc814461263d282a84286fd4f72c79562e',
                    clientSecret: '',
                  },
                },
              },
            },
          },
        }}
      />
    </div>
  )
}
