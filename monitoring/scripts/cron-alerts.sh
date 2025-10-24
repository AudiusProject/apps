#!/usr/bin/env bash

# crontab
# */10 * * * * sudo su ubuntu -c "cd ~/apps/monitoring && scripts/cron-alerts.sh" >> /tmp/logs/cron-alerts.log 2>&1

set -ex

date

# grab a list of current alert UIDs
old_uids=$(mktemp)
for file in grafana/alerts/*.json; do
    jq -r '.[].uid' "${file}" >> ${old_uids}
done
cat ${old_uids} | sort | sponge ${old_uids}

# remove all stale alerts
rm grafana/alerts/*

# set GRAFANA_PASS
set -a
source /home/ubuntu/.profile
set +a

# generate and upload new alerts
echo y | ./grafana/bin/extract-alerts.sh
./grafana/bin/upload-alerts.sh

# grab a list of new Alert UIDs
new_uids=$(mktemp)
for file in grafana/alerts/*.json; do
    jq -r '.[].uid' "${file}" >> ${new_uids}
done
cat ${new_uids} | sort | sponge ${new_uids}

# delete all UIDs that no longer exist
for uid in $(comm -23 ${old_uids} ${new_uids}); do
    bash ./grafana/bin/delete-alert.sh ${uid}
done

date

echo ==================================
