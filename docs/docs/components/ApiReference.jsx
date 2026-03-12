import { useEffect, useRef, useState } from 'react'

const CDN_BASE = 'https://unpkg.com/@stoplight/elements@8.5.1'
const API_URL = '/openapi.yaml'
const MOBILE_QUERY = '(max-width: 1024px)'

let scriptReady = false
const readyCallbacks = []
function whenScriptReady(cb) {
  if (scriptReady) {
    cb()
    return
  }
  readyCallbacks.push(cb)
}

function buildStyles() {
  return `
    :root {
      --api-gutter: max(
        calc((100vw - var(--vocs-content_width)) / 2),
        var(--vocs-sidebar_width, 300px)
      );
      --api-left-offset: calc(var(--api-gutter) - var(--vocs-sidebar_width, 300px));

      --color-canvas-50:  var(--vocs-color_backgroundDark, #F7F7F8);
      --color-canvas-100: var(--vocs-color_backgroundDark, #F7F7F8);
      --color-canvas-200: #F0F1F3;
      --color-canvas-300: #E6E8EC;
      --color-border:       var(--vocs-color_border, #E6E8EC);
      --color-border-light: var(--vocs-color_border, #E6E8EC);
      --color-border-dark:  var(--vocs-color_border2, #D8DBE2);
    }

    /* ── Root container ── */
    #api-reference-root {
      position: fixed;
      top: var(--vocs-topNav_height, 60px);
      left: 0; right: 0; bottom: 0;
      overflow: hidden;
      z-index: 50;
      background: #FFFFFF;
      color: #343B49;
    }
    .dark #api-reference-root {
      background: #141414;
      color: #E0E0E0;
    }

    #api-reference-root::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: var(--api-left-offset);
      background: var(--vocs-color_backgroundDark, #F7F7F8);
      z-index: 1;
    }
    .dark #api-reference-root::before {
      background: var(--vocs-color_backgroundDark, #1F1F1F);
    }

    #api-reference-root elements-api {
      display: block;
      height: 100%;
      margin-left: var(--api-left-offset);
      width: calc(100% - var(--api-left-offset));
    }

    .sl-elements {
      font-family: 'Avenir Next LT Pro', system-ui, -apple-system, sans-serif;
    }

    /* ══════════════════════════════════════
       SIDEBAR
    ══════════════════════════════════════ */
    .sl-elements aside.sl-flex {
      width: var(--vocs-sidebar_width, 300px) !important;
      min-width: var(--vocs-sidebar_width, 300px) !important;
      max-width: var(--vocs-sidebar_width, 300px) !important;
      flex-shrink: 0 !important;
      background: var(--vocs-color_backgroundDark, #F7F7F8) !important;
      border: none !important;
      box-shadow: none !important;
    }
    .sl-elements .sl-overflow-y-auto { scrollbar-width: thin; }

    /* ══════════════════════════════════════
       TEXT CONTRAST — override Stoplight's
       HSL-based variables at EVERY scope
       they define them on.
    ══════════════════════════════════════ */
    :root,
    [data-theme],
    [data-theme=light],
    [data-theme=light] .sl-inverted .sl-inverted,
    .sl-elements {
      --color-text-muted: #343B49 !important;
      --color-text-light: #4A5263 !important;
    }

    .sl-elements .sl-inverted,
    :root .sl-inverted,
    [data-theme] .sl-inverted {
      --color-text-muted: rgba(255,255,255,0.65) !important;
      --color-text-light: rgba(255,255,255,0.5) !important;
    }

    /* In light mode, .sl-inverted panels have a light background — use dark text */
    .sl-elements .sl-inverted:not(.dark *) {
      color: #1A1F2E !important;
    }
    .sl-elements .sl-inverted input,
    .sl-elements .sl-inverted select,
    .sl-elements .sl-inverted textarea {
      color: #1A1F2E !important;
      background: #FFFFFF !important;
      border-color: #D0D4DC !important;
    }

    /* sl-panel__titlebar — API Base URL lives here; force dark text */
    .sl-elements .sl-panel__titlebar:not(.sl-inverted),
    .sl-elements .sl-panel__titlebar:not(.sl-inverted) * {
      color: #343B49 !important;
    }
    /* ServerInfo / server selector — force dark text, but not badges */
    .sl-elements .ServerInfo,
    .sl-elements .ServerInfo *:not(.sl-badge):not(.sl-badge *) {
      color: #343B49 !important;
    }
    .sl-elements .ServerInfo input,
    .sl-elements .ServerInfo select {
      color: #343B49 !important;
    }
    .sl-elements .ServerInfo input::placeholder,
    .sl-elements .ServerInfo .sl-placeholder::placeholder {
      color: #4A5263 !important;
      opacity: 1 !important;
    }
    /* All placeholder text — #id selector for max specificity */
    #api-reference-root *::placeholder {
      color: #343B49 !important;
      opacity: 1 !important;
    }
    #api-reference-root *::-ms-input-placeholder {
      color: #343B49 !important;
      opacity: 1 !important;
    }
    .dark #api-reference-root *::placeholder {
      color: #707070 !important;
      opacity: 1 !important;
    }
    .dark #api-reference-root *::-ms-input-placeholder {
      color: #707070 !important;
      opacity: 1 !important;
    }
    /* Utility class overrides */
    .sl-elements .sl-text-muted { color: #343B49 !important; }
    .sl-elements .sl-text-light { color: #4A5263 !important; }

    /* ══════════════════════════════════════
       LIGHT MODE ACCENT
    ══════════════════════════════════════ */
    .sl-elements .sl-text-primary,
    .sl-elements a.sl-text-primary   { color: #7F6AD6 !important; }
    .sl-elements .sl-bg-primary      { background-color: #7F6AD6 !important; }
    .sl-elements .sl-border-primary  { border-color: #7F6AD6 !important; }
    .sl-elements .sl-ring-primary    { --tw-ring-color: #7F6AD6 !important; }
    .sl-elements [aria-current="true"],
    .sl-elements [data-state="active"] {
      color: #7F6AD6 !important;
      border-color: #7F6AD6 !important;
    }

    .sl-elements .sl-panel__titlebar {
      background: #F0F1F3;
      border-bottom: 1px solid #E6E8EC;
    }
    .sl-elements .HttpOperation__Parameters .sl-text-base { font-size: 0.875rem; }

    /* Code blocks — smaller font + light mode background */
    .sl-elements pre,
    .sl-elements code,
    .sl-elements .sl-bg-code,
    .sl-elements .sl-code-editor,
    .sl-elements [class*="sl-code-viewer"],
    .sl-elements [class*="CodeEditor"],
    .sl-elements [class*="JsonEditor"] {
      font-size: 0.8125rem !important;
    }
    .sl-elements pre,
    .sl-elements .sl-bg-code,
    .sl-elements .sl-code-editor,
    .sl-elements [class*="sl-code-viewer"],
    .sl-elements [class*="CodeEditor"],
    .sl-elements [class*="JsonEditor"] {
      background-color: #F0F1F3 !important;
      color: #1A1F2E !important;
    }
    .sl-elements .token.string    { color: #0550AE !important; }
    .sl-elements .token.number    { color: #0550AE !important; }
    .sl-elements .token.boolean   { color: #0550AE !important; }
    .sl-elements .token.null      { color: #0550AE !important; }
    .sl-elements .token.property  { color: #6639BA !important; }
    .sl-elements .token.key       { color: #6639BA !important; }
    .sl-elements .token.punctuation,
    .sl-elements .token.operator  { color: #333333 !important; }
    .sl-elements .token.keyword   { color: #CF222E !important; }
    .sl-elements .token.comment   { color: #6E7781 !important; }

    /* ══════════════════════════════════════
       DARK MODE — brighter text for contrast
    ══════════════════════════════════════ */
    .dark .sl-elements,
    .dark .sl-elements [class*="sl-bg-canvas"] {
      background-color: #141414 !important;
      color: #E0E0E0 !important;
    }
    .dark .sl-elements [class*="sl-bg-canvas-50"],
    .dark .sl-elements [class*="sl-bg-canvas-100"],
    .dark .sl-elements [class*="sl-bg-canvas-200"],
    .dark .sl-elements [class*="sl-bg-canvas-dialog"],
    .dark .sl-elements [class*="sl-bg-canvas-tint"],
    .dark .sl-elements .sl-bg-code {
      background-color: #1F1F1F !important;
    }
    .dark .sl-elements aside.sl-flex {
      background: var(--vocs-color_backgroundDark, #1F1F1F) !important;
    }
    /* Dark mode: override [data-theme=dark] vars for readable text */
    .dark .sl-elements,
    .dark .sl-elements [data-theme],
    .dark .sl-elements [data-theme=dark] {
      --color-text-muted: #C0C0C0 !important;
      --color-text-light: #B0B0B0 !important;
    }
    /* API Base URL, ServerInfo, panel titlebar — bright text in dark mode */
    .dark .sl-elements .sl-panel__titlebar,
    .dark .sl-elements .sl-panel__titlebar *,
    .dark .sl-elements .ServerInfo,
    .dark .sl-elements .ServerInfo *:not(.sl-badge):not(.sl-badge *) {
      color: #E0E0E0 !important;
    }
    .dark .sl-elements .ServerInfo input,
    .dark .sl-elements .ServerInfo select {
      color: #E0E0E0 !important;
    }
    .dark .sl-elements .sl-text-primary,
    .dark .sl-elements a.sl-text-primary   { color: #B7A8F0 !important; }
    .dark .sl-elements .sl-bg-primary      { background-color: #806AD8 !important; }
    .dark .sl-elements .sl-border-primary  { border-color: #806AD8 !important; }
    .dark .sl-elements .sl-ring-primary    { --tw-ring-color: #806AD8 !important; }
    .dark .sl-elements [aria-current="true"],
    .dark .sl-elements [data-state="active"] {
      color: #B7A8F0 !important;
      border-color: #806AD8 !important;
    }
    .dark .sl-elements h1, .dark .sl-elements h2,
    .dark .sl-elements h3, .dark .sl-elements h4 { color: #FFFFFF !important; }
    .dark .sl-elements [class*="sl-text-heading"],
    .dark .sl-elements [class*="sl-text-title"],
    .dark .sl-elements [class*="sl-text-sub-heading"] { color: #FFFFFF !important; }
    .dark .sl-elements [class*="sl-text-paragraph"],
    .dark .sl-elements [class*="sl-text-base"]    { color: #E0E0E0 !important; }
    /* Muted/light text — brighter for dark mode readability */
    .dark .sl-elements [class*="sl-text-muted"],
    .dark .sl-elements [class*="sl-text-light"]   { color: #C0C0C0 !important; }
    .dark .sl-elements label                     { color: #C0C0C0 !important; }
    /* Code block / try-it panel labels (Request Sample, Response Example) */
    .dark .sl-elements [class*="sl-code-editor"] + *,
    .dark .sl-elements [class*="CodeEditor"] + *,
    .dark .sl-elements [class*="JsonEditor"] ~ [class*="sl-text"],
    .dark .sl-elements [class*="TryIt"] [class*="sl-text"],
    .dark .sl-elements [class*="TryItPanel"] span,
    .dark .sl-elements [class*="TryItPanel"] label { color: #C0C0C0 !important; }
    /* Prose, parameter descriptions, overview text */
    .dark .sl-elements .sl-prose,
    .dark .sl-elements .sl-prose p,
    .dark .sl-elements [class*="sl-prose"]        { color: #E0E0E0 !important; }
    .dark .sl-elements .sl-prose a                { color: #B7A8F0 !important; }
    .dark .sl-elements [class*="sl-border-t"],
    .dark .sl-elements [class*="sl-border-b"],
    .dark .sl-elements [class*="sl-border-l"],
    .dark .sl-elements [class*="sl-border-r"],
    .dark .sl-elements [class$="sl-border"]       { border-color: #333333 !important; }
    .dark .sl-elements [class*="sl-divide"] > * + * { border-color: #333333 !important; }
    .dark .sl-elements .sl-panel__titlebar,
    .dark .sl-elements [class*="sl-panel"] {
      background: #1F1F1F !important;
      border-color: #333333 !important;
    }
    .dark .sl-elements .sl-panel__titlebar { border-bottom-color: #333333 !important; }
    .dark .sl-elements input,
    .dark .sl-elements textarea,
    .dark .sl-elements select {
      background: #292929 !important;
      color: #E0E0E0 !important;
      border-color: #474747 !important;
    }
    .dark .sl-elements input::placeholder,
    .dark .sl-elements textarea::placeholder,
    .dark .sl-elements .sl-placeholder { color: #707070 !important; opacity: 1 !important; }
    .dark .sl-bg-canvas-dialog input::placeholder,
    .dark .sl-bg-canvas-dialog textarea::placeholder,
    .dark .sl-popover input::placeholder,
    .dark .sl-popover textarea::placeholder { color: #707070 !important; opacity: 1 !important; }
    .dark .sl-elements pre,
    .dark .sl-elements code:not([class*="language-"]) {
      background: #1F1F1F !important;
      color: #E0E0E0 !important;
      border-color: #333333 !important;
    }
    .dark .sl-elements .sl-code-editor,
    .dark .sl-elements [class*="sl-code-viewer"],
    .dark .sl-elements [class*="JsonEditor"],
    .dark .sl-elements [class*="CodeEditor"] {
      background: #1F1F1F !important;
      color: #E0E0E0 !important;
    }
    .dark .sl-elements tr              { border-color: #333333 !important; }
    .dark .sl-elements tr:nth-child(even) { background: #1F1F1F !important; }
    .dark .sl-elements th { color: #FFFFFF !important; background: #292929 !important; border-color: #333333 !important; }
    .dark .sl-elements td { color: #E0E0E0 !important; border-color: #333333 !important; }
    /* Error status codes (400, 500) — brighter for dark mode */
    .dark .sl-elements [class*="sl-text-danger"],
    .dark .sl-elements [class*="sl-text-warning"] { color: #F0A0A0 !important; }
    .dark .sl-elements [class*="sl-bg-danger"] { background-color: rgba(249,77,98,0.25) !important; color: #F0A0A0 !important; }
    .dark .sl-elements [class*="sl-bg-warning"] { background-color: rgba(239,179,96,0.25) !important; color: #EFB360 !important; }
    .dark .sl-elements * { scrollbar-color: #474747 #1F1F1F; }
    .dark .sl-elements *::-webkit-scrollbar-track { background: #1F1F1F; }
    .dark .sl-elements *::-webkit-scrollbar-thumb { background: #474747; border-radius: 4px; }

    /* ══════════════════════════════════════
       AUTH DIALOG PORTAL
       The dialog is appended to document.body
       (outside .sl-elements), so target broadly.
       --color-canvas-dialog is set inline on
       [data-theme], so override bg directly.
    ══════════════════════════════════════ */
    .dark .sl-bg-canvas-dialog {
      background-color: #1E1E1E !important;
      color: #E0E0E0 !important;
    }
    .dark .sl-bg-canvas-dialog * { color: #E0E0E0 !important; }
    .dark .sl-bg-canvas-dialog input,
    .dark .sl-bg-canvas-dialog textarea,
    .dark .sl-bg-canvas-dialog select {
      background: #292929 !important;
      color: #F0F0F0 !important;
      border-color: #474747 !important;
    }

    /* Portaled popovers (language picker, etc.) */
    .dark .sl-popover {
      background-color: #1E1E1E !important;
      border-color: #333333 !important;
      color: #E0E0E0 !important;
    }
    .dark .sl-popover * { color: #E0E0E0 !important; }
    .dark .sl-popover [class*="sl-bg-canvas"] {
      background-color: #1E1E1E !important;
    }
    .dark .sl-popover li:hover,
    .dark .sl-popover [class*="sl-bg-canvas"]:hover {
      background-color: #2A2A2A !important;
    }

    /* ══════════════════════════════════════
       CODE BLOCK TOKEN COLORS
       Stoplight injects a <style> that sets
       .token.* colors — override here.
    ══════════════════════════════════════ */
    .dark .sl-elements .token.string    { color: #9ECBFF !important; }
    .dark .sl-elements .token.number    { color: #79C0FF !important; }
    .dark .sl-elements .token.boolean   { color: #79C0FF !important; }
    .dark .sl-elements .token.null      { color: #79C0FF !important; }
    .dark .sl-elements .token.property  { color: #E3BBFF !important; }
    .dark .sl-elements .token.key       { color: #E3BBFF !important; }
    .dark .sl-elements .token.punctuation,
    .dark .sl-elements .token.operator  { color: #C9D1D9 !important; }
    .dark .sl-elements .token.keyword   { color: #FF7B72 !important; }
    .dark .sl-elements .token.comment   { color: #8B949E !important; }

    /* ══════════════════════════════════════
       MOBILE LAYOUT
       Stoplight has a responsive layout mode;
       these overrides remove desktop-only sizing.
    ══════════════════════════════════════ */
    @media (max-width: 1024px) {
      :root {
        --api-gutter: 0px;
        --api-left-offset: 0px;
      }

      #api-reference-root {
        overflow: hidden;
      }

      #api-reference-root::before {
        display: none;
      }

      #api-reference-root elements-api {
        margin-left: 0;
        width: 100%;
      }

      .sl-elements aside.sl-flex {
        width: min(86vw, var(--vocs-sidebar_width, 300px)) !important;
        min-width: min(86vw, var(--vocs-sidebar_width, 300px)) !important;
        max-width: min(86vw, var(--vocs-sidebar_width, 300px)) !important;
        height: 100%;
        max-height: calc(100dvh - var(--vocs-topNav_height, 60px));
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
      }

      .sl-elements .sl-overflow-y-auto,
      .sl-elements [class*="overflow-y-auto"] {
        max-height: calc(100vh - var(--vocs-topNav_height, 60px));
        max-height: calc(100dvh - var(--vocs-topNav_height, 60px));
        overflow-x: hidden !important;
        overflow-y: scroll !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .sl-elements aside.sl-flex .sl-overflow-y-auto,
      .sl-elements aside.sl-flex [class*="overflow-y-auto"] {
        max-height: calc(100vh - var(--vocs-topNav_height, 60px));
        max-height: calc(100dvh - var(--vocs-topNav_height, 60px));
        overflow-x: hidden !important;
        overflow-y: scroll !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .sl-elements pre,
      .sl-elements code,
      .sl-elements .sl-bg-code,
      .sl-elements .sl-code-editor,
      .sl-elements [class*="sl-code-viewer"],
      .sl-elements [class*="CodeEditor"],
      .sl-elements [class*="JsonEditor"] {
        max-width: 100%;
      }
    }
  `
}

/**
 * After Stoplight Elements renders, walk the DOM inside #api-reference-root
 * and fix things that CSS alone can't reliably override:
 *   1. Strip sidebar/content divider borders (sl-border-r, sl-border-l classes)
 *   2. Override inline-style colors on [data-theme] containers
 */
function patchStoplightDOM(root) {
  if (!root) return

  root.querySelectorAll('[class*="sl-border-r"], [class*="sl-border-l"]').forEach((el) => {
    const cl = el.classList
    ;['sl-border-r', 'sl-border-l', 'sl-border-r-2', 'sl-border-l-2'].forEach((c) => cl.remove(c))
    el.style.borderLeftWidth = '0'
    el.style.borderRightWidth = '0'
  })

  const isDark = document.documentElement.classList.contains('dark')
  root.querySelectorAll('[data-theme]').forEach((el) => {
    if (isDark) {
      el.style.setProperty('--color-text-muted', '#C0C0C0')
      el.style.setProperty('--color-text-light', '#B0B0B0')
      el.style.setProperty('--color-canvas-dialog', '#1E1E1E')
      el.style.setProperty('--color-canvas-100', '#1F1F1F')
      el.style.setProperty('--color-canvas-50', '#1A1A1A')
      el.style.setProperty('--color-canvas-200', '#242424')
    } else {
      el.style.setProperty('--color-text-muted', '#343B49')
      el.style.setProperty('--color-text-light', '#4A5263')
      el.style.setProperty('--color-canvas-dialog', '#FFFFFF')
      el.style.setProperty('--color-canvas-100', '#F7F7F8')
      el.style.setProperty('--color-canvas-50', '#F7F7F8')
      el.style.setProperty('--color-canvas-200', '#F0F1F3')
    }
  })

  // In light mode, .sl-inverted elements (code panels) override canvas vars back
  // to Stoplight's dark defaults — reset them explicitly.
  if (!isDark) {
    root.querySelectorAll('.sl-inverted').forEach((el) => {
      el.style.setProperty('--color-canvas-100', '#F7F7F8')
      el.style.setProperty('--color-canvas-50', '#F7F7F8')
      el.style.setProperty('--color-canvas-200', '#F0F1F3')
      el.style.setProperty('--color-canvas-dialog', '#FFFFFF')
      el.style.setProperty('--color-text-muted', '#343B49')
      el.style.setProperty('--color-text-light', '#4A5263')
      el.style.setProperty('color', '#1A1F2E')
    })
  }

  // Light mode only: fix washed-out text (darken anything where R,G,B > 150)
  const aside = root.querySelector('aside')
  if (!isDark) {
    root
      .querySelectorAll(
        '.sl-text-muted, .sl-text-light, [class*="sl-text-muted"], [class*="sl-text-light"], .ServerInfo, .ServerInfo *, input, select, label, .sl-form-group, .sl-form-group *',
      )
      .forEach((el) => {
        if (el.closest('.sl-badge') || el.classList.contains('sl-badge')) return
        if (el.closest('.sl-inverted')) return
        if (aside && aside.contains(el)) return
        const computed = getComputedStyle(el)
        const rgb = computed.color
        const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (m && +m[1] > 150 && +m[2] > 150 && +m[3] > 150) {
          el.style.setProperty('color', '#343B49', 'important')
        }
      })
  }

  root.querySelectorAll('input, select').forEach((el) => {
    if (isDark) {
      el.style.setProperty('--color-text-light', '#B0B0B0')
      el.style.setProperty('--color-text-muted', '#C0C0C0')
    } else {
      el.style.setProperty('--color-text-light', '#4A5263')
      el.style.setProperty('--color-text-muted', '#343B49')
    }
  })

  const isMobile = window.matchMedia(MOBILE_QUERY).matches
  if (isMobile) {
    root.querySelectorAll('.sl-overflow-y-auto, [class*="overflow-y-auto"], aside.sl-flex').forEach((el) => {
      el.style.setProperty('max-height', 'calc(100vh - var(--vocs-topNav_height, 60px))')
      el.style.setProperty('max-height', 'calc(100dvh - var(--vocs-topNav_height, 60px))')
      el.style.setProperty('overflow-x', 'hidden', 'important')
      el.style.setProperty('overflow-y', 'scroll', 'important')
      el.style.setProperty('-webkit-overflow-scrolling', 'touch')
    })
  }
}

export default function ApiReference() {
  const [loaded, setLoaded] = useState(scriptReady)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false,
  )
  const injected = useRef({ link: null, style: null, topNav: null, observer: null })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    const handleChange = (event) => setIsMobile(event.matches)
    setIsMobile(mediaQuery.matches)
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    const searchBtn = Array.from(document.querySelectorAll('button[type="button"]')).find((btn) =>
      btn.textContent.trim().startsWith('Search'),
    )
    if (searchBtn) {
      searchBtn.style.display = 'none'
      return () => {
        searchBtn.style.display = ''
      }
    }
  }, [])

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${CDN_BASE}/styles.min.css`
    document.head.appendChild(link)
    injected.current.link = link

    const style = document.createElement('style')
    style.textContent = buildStyles()
    document.head.appendChild(style)
    injected.current.style = style

    if (!scriptReady) {
      const script = document.createElement('script')
      script.src = `${CDN_BASE}/web-components.min.js`
      script.async = true
      script.onload = () => {
        scriptReady = true
        readyCallbacks.forEach((cb) => cb())
        readyCallbacks.length = 0
      }
      document.head.appendChild(script)
    }

    whenScriptReady(() => {
      if (injected.current.style) {
        document.head.appendChild(injected.current.style)
      }
      setLoaded(true)
    })

    const logoImg = document.querySelector('img[src*="logo"]')
    let topNavEl = logoImg?.parentElement
    while (topNavEl && getComputedStyle(topNavEl).position !== 'fixed') {
      topNavEl = topNavEl.parentElement
    }
    if (topNavEl) {
      const prev = topNavEl.style.background
      topNavEl.style.background =
        'linear-gradient(to right, var(--vocs-color_backgroundDark) var(--api-gutter), transparent var(--api-gutter))'
      injected.current.topNav = { el: topNavEl, prev }
    }

    return () => {
      if (injected.current.topNav) {
        injected.current.topNav.el.style.background = injected.current.topNav.prev
      }
      injected.current.link?.remove()
      injected.current.style?.remove()
      if (injected.current.observer) {
        injected.current.observer.disconnect()
      }
      injected.current = { link: null, style: null, topNav: null, observer: null }
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    const root = document.getElementById('api-reference-root')
    if (!root) return

    const run = () => patchStoplightDOM(root)

    // Patch now and re-patch whenever Stoplight adds/changes DOM nodes
    run()
    const observer = new MutationObserver(run)
    observer.observe(root, { childList: true, subtree: true })

    // Also watch document.body for portaled dialogs (e.g. auth dropdown)
    const patchPortals = () => {
      const isDark = document.documentElement.classList.contains('dark')
      const selector =
        '[data-stoplight-elements] .sl-bg-canvas-dialog, ' +
        '[data-stoplight-elements] .sl-popover, ' +
        '[data-stoplight-elements] [data-theme], ' +
        '[data-stoplight-elements][data-theme]'

      document.body.querySelectorAll(selector).forEach((el) => {
        if (root.contains(el)) return // already handled above

        if (isDark) {
          el.style.setProperty('--color-canvas-dialog', '#1E1E1E')
          el.style.setProperty('--color-canvas-100', '#1E1E1E')
          if (el.classList.contains('sl-bg-canvas-dialog') || el.classList.contains('sl-popover')) {
            el.style.setProperty('background-color', '#1E1E1E', 'important')
          }
        } else {
          el.style.removeProperty('--color-canvas-dialog')
          el.style.removeProperty('--color-canvas-100')
          el.style.removeProperty('background-color')
        }
      })

      if (window.matchMedia(MOBILE_QUERY).matches) {
        const scrollSelector =
          '[data-stoplight-elements] aside, ' +
          '[data-stoplight-elements] .sl-overflow-y-auto, ' +
          '[data-stoplight-elements] [class*="overflow-y-auto"]'

        document.body.querySelectorAll(scrollSelector).forEach((el) => {
          el.style.setProperty('max-height', 'calc(100vh - var(--vocs-topNav_height, 60px))')
          el.style.setProperty('max-height', 'calc(100dvh - var(--vocs-topNav_height, 60px))')
          el.style.setProperty('overflow-x', 'hidden', 'important')
          el.style.setProperty('overflow-y', 'scroll', 'important')
          el.style.setProperty('-webkit-overflow-scrolling', 'touch')
        })
      }
    }
    patchPortals()
    const bodyObserver = new MutationObserver(patchPortals)
    bodyObserver.observe(document.body, { childList: true, subtree: true })
    injected.current.observer = {
      disconnect: () => {
        observer.disconnect()
        bodyObserver.disconnect()
      },
    }

    return () => {
      observer.disconnect()
      bodyObserver.disconnect()
    }
  }, [loaded])

  return (
    <div id="api-reference-root">
      {loaded ? (
        <elements-api
          key={isMobile ? 'mobile' : 'desktop'}
          apiDescriptionUrl={API_URL}
          router="hash"
          layout="responsive"
          hideTryItPanel={isMobile ? 'true' : undefined}
        />
      ) : (
        <Loader />
      )}
    </div>
  )
}

function Loader() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '14px',
      }}
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        style={{ animation: 'api-spin 0.9s linear infinite' }}
      >
        <circle cx="22" cy="22" r="18" stroke="#7F6AD6" strokeWidth="3.5" strokeOpacity="0.15" />
        <path
          d="M40 22a18 18 0 0 0-18-18"
          stroke="#7F6AD6"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#7F6AD6',
          opacity: 0.8,
          letterSpacing: '0.01em',
        }}
      >
        Loading API Reference…
      </span>
      <style>{`@keyframes api-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
