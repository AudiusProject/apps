# Create Audius App

The easiest way to start building on Audius is by using `create-audius-app`. This CLI tool enables you to quickly start building a new Audius application, with everything set up for you. You can create a new app using the default Audius react template, or by using one of the [examples](https://github.com/AudiusProject/apps/tree/main/packages/libs/src/sdk/examples). To get started, use the following command:

### Interactive

You can create a new project interactively by running:

```bash
npx create-audius-app
```

You will be asked for the name of your project, and all the necessary dependencies will be installed.

### Non-interactive

You can also pass command line arguments to set up a new project
non-interactively. See `create-audius-app --help`:

```bash
Usage: create-audius-app <project-directory> [options]

Options:
  -V, --version                        output the version number

  -e, --example [name]|[github-url]

    An example to bootstrap the app with. You can use an example name
    from the Audius repo. They are found in AudiusProject/apps/packages/libs/src/sdk/examples

  -h, --help                           output usage information

Example:

npx create-audius-app my-cool-app --example react-hono
```

## Development

Start up the codebase in watch mode

```
npm run dev
```

Invoke create audius app as you would but replace `npx create-audius-app` with
```bash
./dist/index.js
```

For example:

```bash
./dist/index.js my-cool-app --example react-hono
cd my-cool-app
npm run dev
```
