#!/bin/bash
set -e

function send_slack_message() {
  json_content="$(cat <<EOF
{ 
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$1"
      }
    }
  ]
}
EOF
  )"

  curl -f -X POST -H 'Content-type: application/json' \
    --data "$json_content" \
    "$SLACK_DAILY_DEPLOY_WEBHOOK"
}

function check_prod_tier_health() {
  dn1_monitor_id=796417023
  dn2_monitor_id=796146130
  dn3_monitor_id=796417019
  dn4_monitor_id=796146125
  cn1_monitor_id=796146117
  cn2_monitor_id=796146122
  cn3_monitor_id=796146118
  curl -X POST 'https://api.uptimerobot.com/v2/getMonitors' \
  -H 'Content-Type: application/json' \
  -d '{
        "api_key": "'"$UPTIME_API_KEY"'",
        "format": "json",
        "monitors": "'$dn1_monitor_id-$dn2_monitor_id-$dn3_monitor_id-$dn4_monitor_id-$cn1_monitor_id-$cn2_monitor_id-$cn3_monitor_id'"
      }' > /tmp/get_monitors_result.json
  if ! jq -e '.monitors | map(.status == 2) | all' /tmp/get_monitors_result.json; then
    echo 'Unhealthy monitor found in prod tier (status != 2):'
    cat /tmp/get_monitors_result.json
    return 1
  fi
}


# Abort if auto-deploy is halted
if [ "$HALT_AUTO_DEPLOY" == "true" ]; then
  echo "Auto-deploy is currently halted. Exiting without approval."
  send_slack_message "Normally I'd ship today's release to foundation nodes now, but auto-deploy is currently halted."
  exit 1
fi


# Set job_name for foundation or SP release type
release_type=$1
case "$release_type" in
  foundation)
    job_name="deploy-foundation-nodes-trigger"
    ;;
  sp)
    job_name="release-audius-docker-compose-trigger"
    # Abort if prod tier is unhealthy (for SP release)
    if ! check_prod_tier_health; then
      echo "Canceling release because foundation nodes are unhealthy"
      send_slack_message "SP release has been canceled because foundation nodes are unhealthy. See details at $CIRCLE_BUILD_URL"
      exit 1
    fi
    ;;
  *)
    echo "Invalid release type provided"
    exit 1
    ;;
esac


# Approve the deployments

# Find latest release version
protocol_dir="$(dirname "$(dirname "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")")")"
VERSION="$(jq -r .version "${protocol_dir}/packages/discovery-provider/.version.json")"
echo "Running against protocol version: $VERSION"

# Get the pipeline for the most recent commit on the release branch
response=$(curl --request GET \
  --url "https://circleci.com/api/v2/project/gh/AudiusProject/apps/pipeline?branch=release-v$VERSION" \
  --header "Circle-Token: $CIRCLE_DAILY_DEPLOY_API_TOKEN")

pipeline_id=$(echo "$response" | jq -r '.items[0].id')
pipeline_number=$(echo "$response" | jq -r '.items[0].number')

# Abort early if we can't find the pipeline
if [ -z "$pipeline_id" ] || [ "$pipeline_id" = "null" ]; then
  echo "Could not find pipeline for release-v$VERSION"

  exit 1
fi

# Fetch the "release" workflow
echo "Fetching release workflow from pipeline $pipeline_id"
workflow_id=$(curl --request GET \
  "https://circleci.com/api/v2/pipeline/$pipeline_id/workflow" \
  --header "Circle-Token: $CIRCLE_DAILY_DEPLOY_API_TOKEN" | jq -r '.items[] | select(.name=="release") | .id')

# Fetch the appropriate deployment job
job_id=$(curl --request GET \
  "https://circleci.com/api/v2/workflow/$workflow_id/job" \
  --header "Circle-Token: $CIRCLE_DAILY_DEPLOY_API_TOKEN" | jq -r '.items[] | select(.name=='"\"$job_name\""' and .status=="on_hold") | .id')

# If we found the job, approve it automatically
if [ -n "$job_id" ]; then
  echo "Approving job with id=$job_id"
  job_url="https://app.circleci.com/pipelines/gh/AudiusProject/apps/$pipeline_number/workflows/$workflow_id"
  curl --request POST \
    "https://circleci.com/api/v2/workflow/$workflow_id/approve/$job_id" \
    --header "Circle-Token: $CIRCLE_DAILY_DEPLOY_API_TOKEN"

  send_slack_message "Deploying <${job_url}|release-v$VERSION> to $release_type nodes. Please watch for issues."
else
  # If we couldn't find the deploy trigger job on hold, send the failure message
  send_slack_message "No CircleCI job is on hold for me to auto-approve for today's $release_type release (hint: check <https://app.circleci.com/pipelines/github/AudiusProject/apps?branch=$CIRCLE_BRANCH|here>)"
fi
