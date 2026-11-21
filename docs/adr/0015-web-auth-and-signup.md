# 0015. Auth, sign-up and account on web

- Status: Accepted
- Date: 2026-11-21

## Context

Sign-in, sign-up, OAuth, manager mode and privacy handling. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/common/store/pages/deactivate-account/sagas.ts`

- deactivate-account sagas dispatch afterDeactivationSignOut from the confirmer success so the confirmer can clear before signing out. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/deactivate-account/sagas.ts#L43))
- waitAndSignOut waits for confirmCalls to empty so reload doesn't trigger the beforeUnload dialog; waiting on getIsConfirming did not work. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/deactivate-account/sagas.ts#L58))
- waitAndSignOut delays 10ms after confirmations end so the beforeUnload handler can clear before signOut. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/deactivate-account/sagas.ts#L63))

### `src/common/store/pages/signon/actions.ts`

- setIdentityAccountReady marks the Identity step done so core account creation can be retried without registering the email again. ([L292](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/actions.ts#L292))

### `src/common/store/pages/signon/errorSagas.ts`

- signon errorSagas puts SIGN_IN_FAILED in noRedirectSet because sign-in errors are never fatal. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/errorSagas.ts#L8))

### `src/common/store/pages/signon/getSignOnRoute.ts`

- getSignOnRoute resumes Identity-only accounts without a handle at handle selection, and accounts with an indexed handle at profile details. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/getSignOnRoute.ts#L19))

### `src/common/store/pages/signon/reducer.js`

- signon reducer finishedPhase1 marks the point before Select Genres at which the account gets created. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/reducer.js#L74))
- The signon reducer keeps routeOnCompletion and routeOnExit on reset so toggling between sign up and sign in still redirects correctly. ([L99](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/reducer.js#L99))

### `src/common/store/pages/signon/sagas.ts`

- getDefautFollowUserIds follows user 51, the official Audius account, by default in production. ([L143](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L143))
- Guest account creation calls updateUserLocationTimezone because it links the user record and creates notification settings needed for purchase emails. ([L413](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L413))
- signUp optimistically writes the completed user to localStorage so getLocalAccount returns full data before the validator indexes it. ([L524](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L524))
- signUp still saves user data to Identity for external-wallet users so they can manage notification settings. ([L558](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L558))
- signUp dispatches setIdentityAccountReady after the Identity write so a failed core user write can be retried without registering the email again. ([L570](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L570))
- signUp looks up an existing account for the wallet before issuing CREATE because a prior relay may have succeeded despite a confirmation timeout. ([L581](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L581))
- signUp completes an existing indexed user with no name instead of creating a second user ID for the same wallet. ([L591](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L591))
- signUp marks browser push permission as requested on web because the sign-on provider opens that prompt itself. ([L656](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L656))
- signUp treats status 0 as well as 429 as rate limiting because some devices report rate limits as status 0. ([L667](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L667))
- signUp rethrows after signUpFailed so the confirmer runs its failure callback; swallowing it would let the success callback overwrite the failure. ([L707](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L707))
- signIn signs out after detecting a deactivated account because authService.signIn persisted a session that fetchAccount would restore on refresh. ([L831](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L831))
- signIn waits for fetchAccountSucceeded before recording the sign-in event so the account is populated in the store. ([L897](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L897))
- After sign-in on web, the sign-on state reset is delayed 1s so it runs after page load instead of competing with the UI. ([L935](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L935))
- completeFollowArtists calls followArtists(true) only once account creation is done, skipping defaults that already ran; otherwise the in-progress creation calls it. ([L976](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L976))
- followArtists auto-follows playlist 4281, Hot & New, in production unless skipDefaultFollows is set. ([L995](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L995))
- The SIGN_UP watcher forks fetchDefaultFollowArtists in parallel so the follow step doesn't add perceived signup latency. ([L1079](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/signon/sagas.ts#L1079))

### `src/components/change-email/ChangeEmailModal.tsx`

- ChangeEmailModal first calls changeEmail without an OTP to force identity to send a fresh OTP. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/change-email/ChangeEmailModal.tsx#L66))

### `src/hooks/useCoverPhoto.ts`

- useCoverPhoto forces the default placeholder for deactivated or deleted accounts so their cover photo is never exposed. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useCoverPhoto.ts#L38))

### `src/hooks/useProfilePicture.ts`

- useProfilePicture forces the default placeholder for deactivated or deleted accounts so their profile picture is never exposed. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useProfilePicture.ts#L33))

### `src/pages/oauth-login-page/hooks.ts`

- OAuth login collapseScopes reduces space-separated scopes to the highest privilege because Swagger UI sends 'scope=read write' when multiple scopes are selected. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/oauth-login-page/hooks.ts#L32))

### `src/pages/oauth-login-page/utils.ts`

- getIsRedirectValid only blocks javascript:, data: and vbscript: redirect schemes; domain and path validation is enforced server-side against the OAuth client's registered redirect URIs. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/oauth-login-page/utils.ts#L29))

### `src/pages/oauth-pay-page/hooks.ts`

- OAuth pay waits 100ms after posting the result to the opener before window.close so the message is delivered. ([L384](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/oauth-pay-page/hooks.ts#L384))

### `src/pages/settings-page/components/desktop/ManagerMode/AccountListItem/ManagedUserListItem.tsx`

- ManagedUserListItem hides DM and switch options in manager mode because the logged-in manager has no permission to perform those actions on behalf of a managed account. ([L147](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/settings-page/components/desktop/ManagerMode/AccountListItem/ManagedUserListItem.tsx#L147))

### `src/pages/settings-page/components/desktop/ManagerMode/AccountListItem/ManagerListItem.tsx`

- ManagerListItem hides DM and switch options in manager mode because the logged-in manager has no permission to perform those actions on behalf of a managed account. ([L94](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/settings-page/components/desktop/ManagerMode/AccountListItem/ManagerListItem.tsx#L94))

### `src/pages/sign-in-page/ConfirmEmailPage.tsx`

- ConfirmEmailPage dispatches startSignUp only for guests because for regular users it would open the sign-up welcome modal after a plain sign-in. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-in-page/ConfirmEmailPage.tsx#L54))

### `src/pages/sign-on-page/SignOnPage.tsx`

- SignOnPage opens the Welcome modal itself because on sign-up success it short-circuits with Navigate and never renders SignUpPage, so hooks on /signup/completed are skipped. ([L235](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-on-page/SignOnPage.tsx#L235))
- SignOnPage latches success in a ref because the saga resets status to editing before the lazy completion route commits, and re-rendering the form would trigger a /signin redirect that cancels navigation. ([L321](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-on-page/SignOnPage.tsx#L321))

### `src/pages/sign-up-page/SignUpPage.tsx`

- SignUpRoute passes the full location.pathname to determineAllowedRoute because the hook expects the untrimmed path. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/SignUpPage.tsx#L57))

### `src/pages/sign-up-page/components/EmailField.tsx`

- EmailField writes every keystroke to redux because email inputs appear in several sign-on screens and must stay in sync when switching between them. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/components/EmailField.tsx#L14))

### `src/pages/sign-up-page/components/layout.tsx`

- Sign-up PageFooter falls back to default Formik values because MobileCTAPage renders it outside a Formik context. ([L193](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/components/layout.tsx#L193))

### `src/pages/sign-up-page/components/useExternalWalletAuth.ts`

- doesUserExist treats a 401 from getUserAccount as no user for the wallet and rethrows any other error. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/components/useExternalWalletAuth.ts#L24))

### `src/pages/sign-up-page/hooks/useSocialMediaLoader.ts`

- useSocialMediaLoader resets sign-on social state when a user returns to the page after previously linking a social account there mid-flow. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/hooks/useSocialMediaLoader.ts#L20))

### `src/pages/sign-up-page/utils/useDetermineAllowedRoutes.ts`

- useDetermineAllowedRoute opens the Welcome modal via queueMicrotask because determineAllowedRoute runs during SignUpRoute render, and setting modal state while rendering can crash the app. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/utils/useDetermineAllowedRoutes.ts#L21))
- useDetermineAllowedRoute restricts routes to post-account steps once the account is created or being created in the background, since users cannot go back to earlier sign-up steps. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/utils/useDetermineAllowedRoutes.ts#L83))
- useDetermineAllowedRoute always allows the loading step past the account phase because users can skip genre and artist selection. ([L86](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/utils/useDetermineAllowedRoutes.ts#L86))
- useDetermineAllowedRoute always allows select-genres once past the account phase so users are never redirected to a later step from it. ([L144](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/utils/useDetermineAllowedRoutes.ts#L144))
- useDetermineAllowedRoute redirects to select-genres instead of select-artists when past the account phase and no genres were chosen, so genres always come after finish-profile. ([L162](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/utils/useDetermineAllowedRoutes.ts#L162))
- useDetermineAllowedRoute does not open the post-sign-up welcome modal; SignOnPage does because the success path never renders the SignUpRoute tree. ([L173](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/sign-up-page/utils/useDetermineAllowedRoutes.ts#L173))
