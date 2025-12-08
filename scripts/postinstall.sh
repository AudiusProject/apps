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

printf "${GREEN}Applying patches...\n${NC}"
npm run patch-package > /dev/null

# xcodebuild may exist (e.g. if xcode-select is installed via homebrew) but won't work alone
if [[ -z "${SKIP_POD_INSTALL}" ]]; then
  if ! xcodebuild --help &>/dev/null; then
    printf "${YELLOW}WARNING: Xcode not installed. Skipping mobile dependency installation.${NC}\n"
    SKIP_POD_INSTALL=true
  fi
fi

if [[ -z "${SKIP_POD_INSTALL}" ]]; then
  printf "${GREEN}Installing cocoapods...\n${NC}"
  {
    cd ./packages/mobile/ios

    if command -v bundle >/dev/null; then
      bundle check || bundle install
    fi
    if command -v pod >/dev/null; then
      bundle exec pod install
    fi
    cd ../../..
  } > /dev/null
fi

if [[ -z "${SKIP_ANDROID_INSTALL}" ]]; then
  if command -v java >/dev/null; then
    {
      printf "${GREEN}Setting up Android dependencies...\n${NC}"
      cd ./packages/mobile/android
      ./gradlew :app:downloadAar
      cd ../../..
    } > /dev/null
  else
    printf "${YELLOW}WARNING: Java not found. Skipping Android AAR installation.${NC}\n"
  fi
else
  printf "${YELLOW}WARNING: SKIP_ANDROID_INSTALL set. Skipping Android AAR installation.${NC}\n"
fi

if [[ -z "${CI}" ]]; then
  printf "${GREEN}Setting up audius-compose...\n${NC}"
  ./dev-tools/setup.sh > /dev/null
fi

if [[ -z "${CI}" ]]; then
  printf "${GREEN}Installing discovery provider dependencies...\n${NC}"
  pip install -r packages/discovery-provider/requirements.txt > /dev/null
fi

printf "\n${GREEN}Audius monorepo ready!\n${NC}"
