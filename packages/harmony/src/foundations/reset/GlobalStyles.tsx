import { Global, css } from '@emotion/react'

/**
 * GlobalStyles component that applies base styles via CSS-in-JS.
 * These styles complement the reset.css file and ensure consistent
 * styling across the application, replacing styles that were previously
 * provided by antd.
 */
export const GlobalStyles = () => {
  return (
    <Global
      styles={css`
        /* Global link styles - prevents default browser underlines */
        /* Note: TextLink components handle their own styling via CSS-in-JS */
        a {
          color: inherit;
          text-decoration: none;
          background-color: transparent;
          outline: none;
          cursor: pointer;
          transition: color 0.15s ease-in-out;
        }

        a:hover,
        a:focus {
          text-decoration: none;
          outline: none;
        }

        a:active {
          outline: none;
        }

        /* Remove default link styles for buttons styled as links */
        button {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          cursor: pointer;
          outline: inherit;
        }
      `}
    />
  )
}
