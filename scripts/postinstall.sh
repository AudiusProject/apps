#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'


if [[ -z "${CI}" ]]; then
  printf "${GREEN}Updating git secrets...\n${NC}"
  npm run install-git-secrets > /dev/null
fi

printf "${GREEN}Applying patches...\n${NC}"
npm run patch-package > /dev/null

printf "${GREEN}Patching React Native ExceptionsManager (Hermes fix)...\n${NC}"
if [[ -f "./packages/mobile/scripts/patch-react-native-exceptions.js" ]]; then
  node ./packages/mobile/scripts/patch-react-native-exceptions.js
fi

# xcodebuild may exist (e.g. if xcode-select is installed via homebrew) but won't work alone
if [[ -z "${SKIP_POD_INSTALL}" ]]; then
  if ! xcodebuild --help &>/dev/null; then
    printf "${YELLOW}WARNING: Xcode not installed. Skipping mobile dependency installation.${NC}\n"
    SKIP_POD_INSTALL=true
  fi
fi

# When skipping iOS (no Xcode or SKIP_POD_INSTALL), skip Android too so we don't run
# React Native CLI / Gradle in environments without full mobile tooling (e.g. publish-packages CI).
if [[ -n "${SKIP_POD_INSTALL}" ]]; then
  export SKIP_ANDROID_INSTALL=true
fi

if [[ -z "${SKIP_POD_INSTALL}" ]]; then
  printf "${GREEN}Installing cocoapods...\n${NC}"
  (
    cd ./packages/mobile/ios

    if command -v bundle >/dev/null; then
      bundle check || bundle install
    fi
    if command -v pod >/dev/null; then
      # Podfile.lock stays on fmt 11 for older Xcode; CI may use Xcode 16+ which would otherwise
      # select fmt 12 in the Podfile and disagree with the lock. Default AUDIUS_FMT_LEGACY on CI
      # unless the workflow already set it (e.g. when you intentionally move the lock to fmt 12).
      if [[ -n "${CI}" ]] && [[ -z "${AUDIUS_FMT_LEGACY+x}" ]]; then
        export AUDIUS_FMT_LEGACY=1
      fi
      # Avoid stale fmt (and other local podspec) JSON conflicting with the current podspec on disk.
      rm -rf Pods/Local\ Podspecs 2>/dev/null || true
      export RCT_NEW_ARCH_ENABLED=0
      if [[ -n "${CI}" ]]; then
        bundle exec pod install
      else
        # Xcode 16+ uses fmt 12 in the Podfile while Podfile.lock may still pin fmt 11 — first install
        # can fail until the lock catches up. Refresh fmt, then install (may dirty Podfile.lock locally).
        if ! bundle exec pod install; then
          printf "${YELLOW}pod install failed; running pod update fmt then retrying...${NC}\n" >&2
          bundle exec pod update fmt --no-repo-update
          bundle exec pod install
        fi
      fi
    fi
    cd ../../..
  ) > /dev/null
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
