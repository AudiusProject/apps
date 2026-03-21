# This file defines which directories are included in changelogs for
# client and protocol releases
#
# Usage:
# CLIENT_DIRS=$(bash ./scripts/get-release-directories.sh client)
# git log -- $CLIENT_DIRS

CLIENT_DIRS="packages/web
    packages/fixed-decimal \
    packages/common \
    packages/mobile \
    packages/harmony \
    packages/libs"

PROTOCOL_DIRS="
    dev-tools \
    packages/discovery-provider \
    packages/identity-service \
    monitoring/healthz \
    monitoring/uptime \
    libs \
    protocol-dashboard"

# `client` or `protocol`
release_type="$1"

case "$release_type" in
"client")
    echo $CLIENT_DIRS
    ;;
"protocol")
    echo $PROTOCOL_DIRS
    ;;
esac
