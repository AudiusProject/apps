#!/usr/bin/env bash

set -eo pipefail

[ -f "/etc/os-release" ] && source /etc/os-release
case "$ID" in
debian | ubuntu)
    # Uninstall old versions of docker
    set +e
    for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove $pkg; done
    set -e

    # Install packages to allow apt to use a repository over HTTPS
    sudo apt-get update
    sudo NEEDRESTART_MODE=l apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker's official GPG key:
    if ! [ -f /etc/apt/keyrings/docker.gpg ]; then
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    # Add the repository to Apt sources:
    if ! [ -f /etc/apt/sources.list.d/docker.list ]; then
        echo \
            "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
            "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
            sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
    fi

    # Install dependencies
    sudo NEEDRESTART_MODE=l apt-get install -y --allow-downgrades \
        git \
        python3 \
        python3-pip \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin='2.28.1-1~ubuntu.22.04~jammy'

    curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | sudo bash -s lts

    # Add user to docker group
    sudo usermod -aG docker "$USER"

    # Increase file watchers
    echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

    # add script directories to path, avoiding duplication
    grep -q "export PATH=$HOME/.local/bin:" ~/.profile || echo "export PATH=$HOME/.local/bin:\$PATH" >>~/.profile

    ;;
*)
    if ! command -v docker &>/dev/null; then
        echo "Docker is not installed. Please install docker and try again." >&2
        exit 1
    fi

    if ! command -v python3 &>/dev/null; then
        echo "Python3 is not installed. Please install python3 and try again." >&2
        exit 1
    fi

    if ! command -v pip3 &>/dev/null; then
        echo "pip3 is not installed. Please install pip3 and try again." >&2
        exit 1
    fi

    if ! docker compose version &>/dev/null; then
        echo "Docker compose v2 is not installed. Please install docker compose v2 and try again." >&2
        exit 1
    fi
    ;;
esac

if [[ "${BASH_SOURCE[0]}" == "" ]]; then
    dir="$HOME/apps"
    git clone https://github.com/AudiusProject/apps.git "$dir"
else
    dir="$(dirname "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")")"
fi

python3 -m pip install -r "$dir/dev-tools/requirements.txt"

mkdir -p "$HOME/.local/bin"

ln -sf "$dir/dev-tools/audius-compose" "$HOME/.local/bin/audius-compose"
ln -sf "$dir/dev-tools/audius-cmd" "$HOME/.local/bin/audius-cmd"
