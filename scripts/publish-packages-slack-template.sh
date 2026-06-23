#!/bin/bash

echo "Generating Package Statuses..."

for package in $(jq -r -c '.[]' /tmp/packages.json)     
do
  package_name=$(echo $package | jq -r '.name')
  package_version=$(echo $package | jq -r '.version')
  package_url="https://www.npmjs.com/package/$package_name"
  PACKAGES=$(printf "${PACKAGES} \n <${package_url}|${package_name} ${package_version}>")
done

echo "Writing template..."
jq -c -n --arg header ":rocket: Packages successfully published to npm!"\
    --arg packages "*Packages*: $PACKAGES"\
    -f scripts/slack-templates/publish-packages-template.jq\
  > /tmp/publish-packages-template.json