#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'


if [[ -z "${CI}" ]]; then
  printf "${GREEN}Updating git hooks...\n${NC}"
  npm run install-hooks > /dev/null
fi

if [[ -z "${CI}" ]]; then
  printf "${GREEN}Updating git secrets...\n${NC}"
  npm run install-git-secrets > /dev/null
fi

# xcodebuild may exist (e.g. if xcode-select is installed via homebrew) but won't work alone
if [[ -z "${SKIP_POD_INSTALL}" ]]; then
  if ! xcodebuild --help &>/dev/null; then
    printf "${YELLOW}WARNING: Xcode not installed. Skipping mobile dependency installation.${NC}\n"
    SKIP_POD_INSTALL=true
  fi
fi

if [[ -z "${SKIP_POD_INSTALL}" ]]; then

  mobile_directory="./packages/mobile"
  # packages/mobile won't necessarily exist on installs using `turbo prune`
  if [ -d "$mobile_directory" ]; then
    printf "${GREEN}Installing cocoapods...\n${NC}"
    {
      # Symlink react-native into the root package bc npm doesn't
      # support nohoist

      cd ./packages/mobile

      echo "this should run"
      source_path=node_modules/react-native
      target_path=../../node_modules/react-native
      if [ ! -e "$target_path" ]; then
        mkdir -p ../../node_modules
        ln -s "$(pwd)/$source_path" "$target_path"
      fi

      source_path=../../node_modules/react-native-code-push
      target_path=node_modules/react-native-code-push
      if [ ! -e "$target_path" ]; then
        ln -s "$source_path" "$target_path"
      fi

      cd ./ios

      if command -v bundle >/dev/null; then
        bundle check || bundle install
      fi
      if command -v pod >/dev/null; then
        RCT_NEW_ARCH_ENABLED=0 bundle exec pod install
      fi
      cd ../../..
    } > /dev/null
  fi
fi

printf "${GREEN}Applying patches...\n${NC}"
npm run patch-package > /dev/null

if [[ -z "${CI}" ]]; then
  printf "${GREEN}Setting up audius-compose...\n${NC}"
  ./dev-tools/setup.sh > /dev/null
fi

if [[ -z "${CI}" ]]; then
  printf "${GREEN}Installing discovery provider dependencies...\n${NC}"
  pip install -r packages/discovery-provider/requirements.txt > /dev/null
fi

printf "\n${GREEN}Audius monorepo ready!\n${NC}"
