npm run install-hooks
npm run patch-package

if [[ -z "${SKIP_BUILD}" ]]; then
  npm run build
fi

if [[ -z "${SKIP_POD_INSTALL}" ]]; then
  # Symlink react-native into the mobile package bc npm doesn't
  # support nohoist
  cd packages/mobile/node_modules
  ln -s ../../../node_modules/react-native react-native
  cd ../ios
  bundle check || bundle install 
  if command -v pod >/dev/null; then
    pod install
  fi
fi