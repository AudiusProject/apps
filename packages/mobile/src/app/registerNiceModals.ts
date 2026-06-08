/**
 * Side-effect imports for nice-modal-react registrations.
 *
 * Each imported module calls `NiceModal.register(id, Component)` at module
 * scope. Importing this file from `App.tsx` ensures all registered modals
 * are available before anything tries to `showNiceModal(id)`.
 *
 * Add new NiceModal-managed modals here as they migrate.
 */
import 'app/components/share-drawer/ShareDrawer'
