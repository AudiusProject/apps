#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
should_error=false

if ! [ -z $CI ]; then
  exit 0
fi

export NVM_DIR=$HOME/.nvm;
source $NVM_DIR/nvm.sh;

printf "${GREEN}Confirming node and ruby environments...\n${NC}"
{
  nvm install
  rbenv install -s
} > /dev/null

required_node_version=$(<.nvmrc)
current_node_version=$(node --version)

if [ $current_node_version != $required_node_version ]; then
  printf "${RED}Invalid node version. Expected $required_node_version, got $current_node_version\n${NC}"
  should_error=true
fi

required_ruby_version=$(<'.ruby-version')
current_ruby_version=$(ruby --version)

if [[ ! $current_ruby_version =~ $required_ruby_version ]]; then
  printf "${RED}Invalid ruby version. Expected $required_ruby_version, got $current_ruby_version\n${NC}"
  should_error=true
fi

if [[ $should_error = true ]]; then
  exit 1
fi

printf "\n${GREEN}Environment correctly set up!\n${NC}"
