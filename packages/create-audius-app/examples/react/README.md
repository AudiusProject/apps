# @audius/sdk + React + TypeScript + Vite

This examples shows how to use [`@audius/sdk`](https://www.npmjs.com/package/@audius/sdk) to:

- Fetch data including users and tracks
- Authorize the app to perform writes on behalf of an Audius user
- Write data, in this case favoriting tracks
- Stream tracks

Make sure to add your `apiKey` and `apiSecret` at the top of `App.tsx`

To start run:

```
npm run dev
```

For more details, check out the [docs](https://docs.audius.co/developers/sdk/overview)

This example also uses the Audius design system [Harmony](https://www.npmjs.com/package/@audius/harmony)

## React + TypeScript + Vite Template

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
   parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
   },
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
