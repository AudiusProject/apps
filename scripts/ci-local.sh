#!/usr/bin/env bash
# Run the PR checks from .github/workflows locally for whatever changed
# against origin/main (committed and uncommitted). Green here means the
# PR run would be green, so the branch can go straight to main.
#
# Usage: npm run ci:local [-- --no-build] [-- --all]
#   --no-build  skip the web production/SSR build and bundlesize check
#   --all       run every suite regardless of what changed

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

build=1
all=0
for arg in "$@"; do
  case "$arg" in
    --no-build) build=0 ;;
    --all) all=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

git fetch -q origin main
base=$(git merge-base origin/main HEAD)
changed=$( { git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u)

# Same path filters as the pull_request triggers in each workflow.
touches() {
  [[ $all == 1 ]] && return 0
  local pattern="^($1)"
  grep -qE "$pattern" <<<"$changed"
}
web_paths='packages/(web|embed|common|harmony|libs|sdk)/|package-lock.json|.github/workflows/web.yml'
mobile_paths='packages/(mobile|common|harmony|libs|sdk)/|package-lock.json|.github/workflows/mobile.yml'
sdk_paths='packages/(sdk|eth|fixed-decimal|spl)/|package-lock.json|.github/workflows/sdk.yml'
identity_paths='packages/(identity-service|sdk|spl|eth|fixed-decimal|libs)/|package-lock.json|.github/workflows/identity.yml'

filters=()
suites=()
touches "$web_paths" && filters+=(--filter=@audius/web) && suites+=(web)
touches "$mobile_paths" && filters+=(--filter=@audius/mobile) && suites+=(mobile)
touches "$sdk_paths" && filters+=(--filter=@audius/sdk) && suites+=(sdk)
run_identity=0
touches "$identity_paths" && run_identity=1 && suites+=(identity)

if [[ ${#suites[@]} == 0 ]]; then
  echo "No CI-triggering changes against origin/main."
  exit 0
fi
echo "Changed vs origin/main ($(git rev-parse --short "$base")): ${suites[*]}"

export CI=true
export NODE_OPTIONS=--max-old-space-size=8192
start=$SECONDS
step() { echo; echo "==> $*"; }

if [[ ${#filters[@]} -gt 0 ]]; then
  # verify = lint + typecheck (+ stylelint on web, lint:env on mobile)
  step "verify + test: ${filters[*]}"
  npx turbo run verify test "${filters[@]}" --output-logs=errors-only
fi

if [[ $run_identity == 1 ]]; then
  step "identity-service lint + typecheck"
  npx turbo run lint typecheck --filter=identity-service --output-logs=errors-only

  if docker info >/dev/null 2>&1; then
    step "identity-service tests"
    pg=ci-local-identity-pg
    redis=ci-local-identity-redis
    cleanup() { docker rm -f "$pg" "$redis" >/dev/null 2>&1 || true; }
    trap cleanup EXIT
    cleanup
    docker run -d --name "$pg" -p 7433:5432 \
      -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=audius_identity_service_test postgres:11.1 >/dev/null
    docker run -d --name "$redis" -p 16379:6379 redis:7.0 >/dev/null
    until docker exec "$pg" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
    npx turbo run build --filter='identity-service^...' --output-logs=errors-only
    # default-config.json points the relayers at docker-compose hostnames. CI
    # fails those lookups instantly; some local resolvers hang on them instead.
    dead=http://127.0.0.1:1
    (
      cd packages/identity-service
      isTestRun=true environment=test logLevel=error \
        redisHost=localhost redisPort=16379 POSTGRES_TEST_PORT=7433 \
        dbUrl=postgres://postgres:postgres@localhost:7433/audius_identity_service_test \
        ethTokenAddress= ethRegistryAddress= registryAddress= ethOwnerWallet= \
        web3Provider=$dead nethermindWeb3Provider=$dead secondaryWeb3Provider=$dead ethProviderUrl=$dead \
        npx mocha --timeout 60000
    )
  else
    echo "Docker is not running: skipped identity-service tests (CI still runs them)." >&2
  fi
fi

if [[ $build == 1 ]] && [[ " ${suites[*]} " == *" web "* ]]; then
  step "web production + SSR build, bundlesize"
  (
    cd packages/web
    npm run build:prod
    npm run build:ssr:prod
    npm run bundlesize:prod
  )
fi

echo
echo "ci:local passed (${suites[*]}) in $(( (SECONDS - start) / 60 ))m$(( (SECONDS - start) % 60 ))s"
