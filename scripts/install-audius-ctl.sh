#!/bin/sh

set -e

# Pick the binary for current architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
BINARY_NAME="audius-ctl-${ARCH}-${OS}"

# determine target directory
if [ -w /usr/local/bin ]; then
    TARGET_DIR="/usr/local/bin"
elif echo "$PATH" | grep -q "$HOME/.local/bin"; then
    TARGET_DIR="$HOME/.local/bin"
elif echo "$PATH" | grep -q "$HOME/bin"; then
    TARGET_DIR="$HOME/bin"
else
    echo 'Insufficient permissions and/or no suitable directory found in $PATH'
    echo 'Try using `sudo` or add $HOME/.local/bin to your $PATH'
    exit 1
fi

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    echo "Creating directory $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
fi

if [ "$1" = "local" ]; then
    # install from locally built version
    if ! [ -f "bin/$BINARY_NAME" ] && ! [ -f "bin/audius-ctl-native" ]; then
        echo "No build artifact in ./bin, please run 'make' first"
        exit 1
    elif ! [ -f "bin/$BINARY_NAME" ] && [ -f "bin/audius-ctl-native" ]; then
        BINARY_NAME="audius-ctl-native"
    fi
    cp "bin/$BINARY_NAME" "$TARGET_DIR/audius-ctl"

else
    # install latest release from the web

    # get jq if not installed
    if ! which -s jq; then

        # darwin -> macos, x86_64 -> amd64
        case "$OS" in
            darwin) OSN=macos
            ;;
            *) OSN="$OS"
            ;;
        esac
        case "$ARCH" in
            x86_64) ARCHN=amd64
            ;;
            *) ARCHN="$ARCH"
            ;;
        esac

        # delete existing if left behind by failed installation
        jq_path="$PWD/jq"
        [ -f "$jq_path" ] && rm "$jq_path" || true

        # get jq
        curl -sSL \
            "https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-${OSN}-${ARCHN}" \
            -o "$jq_path"

        # allow executable
        chmod +x "$jq_path"

        # signal to cleanup
        cleanup_jq=true
    else
        jq_path="$(which jq)"
    fi

    # iterate through releases to find audius-ctl
    MAX_PAGES=4
    audius_ctl_tag_regex='^audius-ctl@[0-9]+\\.[0-9]+\\.[0-9]+$'
    echo 'Finding latest audius-ctl release...'
    for page in $(seq 1 $MAX_PAGES); do
        asset_url=$(\
            curl -sSL \
                -H "Accept: application/vnd.github+json" \
                -H "X-GitHub-Api-Version: 2022-11-28" \
                "https://api.github.com/repos/AudiusProject/apps/releases?page=$page" | \
            "$jq_path" -r '([.[] | select(.tag_name | test("'"$audius_ctl_tag_regex"'"))][0] | .assets[]? | select(.name == "'"$BINARY_NAME"'") | .url) // ""' \
        )
        if [ -n "$asset_url" ]; then 
            break
        fi
    done

    # handle release not found
    if [ -z "$asset_url" ]; then 
        echo "Couldn't find latest audius-ctl binary '$BINARY_NAME'."
        echo "Please check for an open issue at https://github.com/AudiusProject/apps/issues"
        [ -n "$cleanup_jq" ] && rm "$jq_path" || true
        exit 1
    fi

    # Download audius-ctl
    curl -sSL \
        -H "Accept: application/octet-stream" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "$asset_url" \
        -o "${TARGET_DIR}/audius-ctl-new"

    # Remove existing installation
    [ -f "${TARGET_DIR}/audius-ctl" ] && rm "${TARGET_DIR}/audius-ctl" || true

    # Put newly downloaded version into place
    mv "${TARGET_DIR}/audius-ctl-new" "${TARGET_DIR}/audius-ctl"
    chmod +x "${TARGET_DIR}/audius-ctl"
fi


echo "$BINARY_NAME has been installed to $TARGET_DIR/audius-ctl"
echo "You can run it using: $ audius-ctl"
echo
echo "Autocompletions are also available for most shells. For details, run 'audius-ctl completion'"

# Inform user about PATH addition if necessary
if ! echo ":$PATH:" | grep -q ":$TARGET_DIR:" ; then
    echo "To use audius-ctl from any location, add ${TARGET_DIR} to your PATH."
    echo "For bash users, add this line to your ~/.bash_profile or ~/.bashrc:"
    echo "export PATH=\"\$PATH:${TARGET_DIR}\""
    echo "For zsh users, add the line to your ~/.zshrc instead."
    echo "After adding the line, restart your terminal or run 'source <file>' on the modified file to update your current session."
fi
