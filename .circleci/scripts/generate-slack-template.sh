#!/bin/bash

echo "Fetching pipeline workflows..."
curl -s --url "https://circleci.com/api/v2/pipeline/${CIRCLE_PIPELINE_ID}/workflow" \
    -H "Circle-Token: ${CIRCLE_TOKEN}" \
    > /tmp/workflows.json
    
# Format the header of the message
echo "Generating Header..."
PIPELINE_STATUS_HEADER=$(jq -r 'if .items | map(.status == "failed") | any then ":x: Pipeline Failed" else ":white_check_mark: Pipeline Succeeded" end' < /tmp/workflows.json)

# Get the Slack User ID of the last commit's author
echo "Getting Slack User ID..."
author_name=$(git log -1 --pretty=format:'%an')
env_key_name="SLACK_ID_FOR_GH_$(echo $author_name | tr ' ' '_' | tr '-' '_' | tr '[:upper:]' '[:lower:]')"
SLACK_USER_ID="$(eval echo \$$env_key_name)"

# Format the commit message of the last commit
echo "Generating Commit Message..."
COMMIT_SHA_LINK=$(git log -1 --pretty=format:'<https://github.com/AudiusProject/apps/commit/%H|%h>' HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=format:'%s' HEAD)

# Get Pipeline URL
PIPELINE_URL=$(jq -r '.items[0] | "https://app.circleci.com/pipelines/\(.project_slug)/\(.pipeline_number)"' /tmp/workflows.json)

# Get workflow and job statuses list
echo "Generating Workflow Statuses..."
WORKFLOW_STATUSES="*Workflows:*"
for workflow in $(jq -r -c '.items[] | select(.id != "'$CIRCLE_WORKFLOW_ID'")' /tmp/workflows.json)
do
  workflow_id=$(echo $workflow | jq -r '.id')
  workflow_filename="/tmp/workflow-${workflow_id}.json"
  curl -s 2>/dev/null --url $(echo $workflow | jq -r '"https://circleci.com/api/v2/workflow/\(.id)/job"') -H "Circle-Token: ${CIRCLE_TOKEN}" -o $workflow_filename
  workflow_url=$(echo $workflow | jq -r '"'$PIPELINE_URL'/workflows/\(.id)"')
  workflow_line=$(echo $workflow | jq -r '"\(if .status == "failed" then ":x:" elif .status == "success" then ":white_check_mark:" else ":grey_question:" end) <'$workflow_url'|\(.name)>"')
  jobs_lines=$(jq -r '.items | map(select(.status == "failed") | "\t\t :x: <'"$workflow_url"'/jobs/\(.job_number)|\(.name)>") | join("\n")' $workflow_filename)
  WORKFLOW_STATUSES=$(printf '%s\n%s\n%s' "$WORKFLOW_STATUSES" "$workflow_line" "$jobs_lines")
done

FAILED_WORKFLOW=$(jq -r '.items | map(.status == "failed") | any' < /tmp/workflows.json)

# Add help text in the case of failure
echo "Generating Summary..."
if [[ $CIRCLE_BRANCH == "main" ]]; then
  if [[ $FAILED_WORKFLOW == "true" ]]; then
    SUMMARY_MESSAGE="*Action Items*:\n1. If you broke `$CIRCLE_BRANCH`, then fix it or revert your change.\n2. If you think a test is flaky, confirm it, make a change to skip the test with a ticket comment, and assign the ticket to the test owner.\n3. Once CI is green again, give this a :white_check_mark:."
    AUTHOR="$author_name <@$SLACK_USER_ID>"
  else
    SUMMARY_MESSAGE="Changes have been merged to main."
    AUTHOR="$author_name"
  fi
else
  if [[ $FAILED_WORKFLOW == "true" ]]; then
    SUMMARY_MESSAGE="If automerge was enabled, the change likely did not merge. Fix your branch and try again."
    AUTHOR="$author_name <@$SLACK_USER_ID>"
  else 
    SUMMARY_MESSAGE="If automerge is enabled, the changes will be merged!"
    AUTHOR="$author_name"
  fi
fi

echo "Writing template..."
jq -n --arg header "$PIPELINE_STATUS_HEADER"\
    --arg author "*Author*: $AUTHOR"\
    --arg branch "*Branch*: <$PIPELINE_URL|$CIRCLE_BRANCH>"\
    --arg commit "$(printf "*Commit*: %s\n\`\`\`%s\`\`\`" "$COMMIT_SHA_LINK" "$COMMIT_MESSAGE")"\
    --arg workflows "$WORKFLOW_STATUSES"\
    --arg summary "$SUMMARY_MESSAGE"\
    -f .circleci/slack-templates/pipeline-status-template.jq\
  > /tmp/pipeline-status-template.json

# Export the template to be available to the slack/notify command
echo "Exporting template to bash environment..."
echo 'export PIPELINE_STATUS_TEMPLATE=$(cat /tmp/pipeline-status-template.json)' >> "$BASH_ENV"
echo "Exporting Slack user ID to bash environment as default channel..."
echo "export SLACK_DEFAULT_CHANNEL=$SLACK_USER_ID" >> $BASH_ENV