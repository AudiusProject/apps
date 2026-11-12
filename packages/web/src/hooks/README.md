# Audius Client Hooks

We have a number of interesting hooks in this folder.
Here we highlight a few common ones for the sake of discoverability.

Each individual file should have more extensive documentation & examples.

## Hooks

### `useNavigateToPage`

Wraps react-router's `useNavigate` in a single function.

### `useInstanceVar`

Convenience wrapper around useRef. Allows `useState`-like ergonomics.

### `useWithMobileStyle`

Wraps `classnames` with mobile switching logic to conditionally add mobile classes.

### `usePortal`

Portals a node out of its place in the dom hierarchy.

### `useHasChangedRoute`

Wraps the react router `useLocation` hook to allow a function to be called on route changes
