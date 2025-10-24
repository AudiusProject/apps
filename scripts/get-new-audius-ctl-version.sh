# This script should be run from the Makefile only.
set -eo pipefail

make_target="$1"
upgrade_type="$2"


# Git hash versioning for non-production builds
if [ "$make_target" = "bin/audius-ctl-native" ]; then
    echo "$(git rev-parse HEAD)"
    exit 0
fi

# Create an awk_script that will increment the right semvar digit depending
# on whether this is a major, minor, or patch upgrade
case "$upgrade_type" in
    major) awk_script='{$1 = $1 + 1;$2 = 0; $3 = 0;} 1'
    ;;
    minor) awk_script='{$2 = $2 + 1; $3 = 0;} 1'
    ;;
    *) awk_script='{$3 = $3 + 1;} 1'
esac

# Grab the latest audius-ctl release from the monorepo
# (there are multiple releases for various packages, so we have to search for the right one)
audius_ctl_tag_regex='^audius-ctl@[0-9]+\\.[0-9]+\\.[0-9]+$'
latest_tag=$(\
    curl -sSL \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/AudiusProject/apps/releases?per_page=100" | \
    jq -r '[.[] | select(.tag_name | test("'"$audius_ctl_tag_regex"'"))][0].tag_name' \
)

if [ -z "$latest_tag" ]; then
    echo 'Error, latest audius-ctl release not found!' 1>&2
    echo 'Does the limit need to be increased in the api url?' 1>&2
    exit 1
fi

# Create a new version by incrementing the latest version
new_version=$(\
    echo "$latest_tag" | \
    cut -d@ -f2 | \
    awk -F. "$awk_script" | \
    sed 's/ /./g' \
)

echo "$new_version"
exit 0
