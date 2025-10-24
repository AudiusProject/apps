# Solana Phone Build Tools & Config

This folder contains relevant info for releasing Audius to the Solana Mobile Stack / Saga.

## Instructions
### Install prerequesites

#### Node
Ensure we are using the correct node version
```
nvm install
nvm use
```
#### PNPM
Then, to install pnpm, run
```
corepack enable
corepack prepare pnpm@`npm info pnpm --json | jq -r .version` --activate
```

#### Project Dependencies
Finally, install project dependencies
```
pnpm install
```

#### Solana cli
We need solana cli to recover a private key
```
brew install solana
```

### Recovering solana keypair
You will need our app's private key to mint new releases and submit updates. Run:
```
solana-keygen recover -o app-keypair.json
```
and paste the seed phase in. There is no associated password, so press enter again. This should output the private key to the app-keypair.json file. Note this file is .gitignored, but do make sure to not check it in.

### Preparing the version
Update the version name + code to the latest release in
[build.gradle](/apps/mobile/android/app/build.gradle)

For the version, see:
https://play.google.com/console/u/0/developers/7193943409852709836/app/4973839560150647536/tracks/production?tab=releases

The version code needs to be a monotonically increasing number.

### Preparing the apk
cd ../android
./gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a
cd ../dapp-store

### Validating the release

Before publishing the apk, validate the release:
```
npx dapp-store validate release -k app-keypair.json -b $ANDROID_HOME/build-tools/35.0.0
```

### Publishing the apk
```
npx dapp-store create release -k app-keypair.json -b $ANDROID_HOME/build-tools/35.0.0 -u https://audius-fe.rpcpool.com
```
> You may not have specified ANDROID_HOME, or have a different build tools version, modify accordingly.

> If successful, this should update .asset-manifest.json with the sha and url of our uploaded .apk, and config.yaml with an updated release mint address. Please commit and push both of these changes.

### Submit dApp update request
```
npx dapp-store publish update -k app-keypair.json -u https://audius-fe.rpcpool.com --requestor-is-authorized --complies-with-solana-dapp-store-policies
```

### Resoures
Reach out to https://github.com/dylanjeffers or https://github.com/raymondjacobson

