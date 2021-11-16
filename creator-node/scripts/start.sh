#!/bin/bash

link_libs=true

if [[ "$WAIT_HOSTS" != "" ]]; then
    /usr/bin/wait
fi

if [[ -n "$LOGGLY_TOKEN" ]]; then
    LOGGLY_TAGS=$(echo $LOGGLY_TAGS | python3 -c "print(' '.join(f'tag=\\\\\"{i}\\\\\"' for i in input().split(',')))")
    mkdir -p /var/spool/rsyslog
    mkdir -p /etc/rsyslog.d
    cat >/etc/rsyslog.d/22-loggly.conf <<EOF
\$WorkDirectory /var/spool/rsyslog # where to place spool files
\$ActionQueueFileName fwdRule1   # unique name prefix for spool files
\$ActionQueueMaxDiskSpace 1g    # 1gb space limit (use as much as possible)
\$ActionQueueSaveOnShutdown on   # save messages to disk on shutdown
\$ActionQueueType LinkedList    # run asynchronously
\$ActionResumeRetryCount -1    # infinite retries if host is down
template(name="LogglyFormat" type="string"
 string="<%pri%>%protocol-version% %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% [$LOGGLY_TOKEN@41058 $LOGGLY_TAGS] %msg%\n")
# Send messages to Loggly over TCP using the template.
action(type="omfwd" protocol="tcp" target="logs-01.loggly.com" port="514" template="LogglyFormat")
EOF
    rsyslogd
fi

if [ -z "$ipfsHost" ]; then
    if [ -z "$(ls -A /root/.ipfs)" ]; then
        ipfs init --profile server
    fi

    ipfs daemon &
    export ipfsHost=localhost
    export ipfsPort=5001
    export WAIT_HOSTS="localhost:5001"
    /usr/bin/wait
fi

if [ -z "$redisHost" ]; then
    redis-server --daemonize yes
    export redisHost=localhost
    export redisPort=6379
    export WAIT_HOSTS="localhost:6379"
    /usr/bin/wait
fi

if [ -z "$dbUrl" ]; then
    if [ -z "$(ls -A /db)" ]; then
        chown -R postgres:postgres /db
        chmod 700 /db
        sudo -u postgres pg_ctl init -D /db
        echo "host all all 0.0.0.0/0 md5" >>/db/pg_hba.conf
        echo "listen_addresses = '*'" >>/db/postgresql.conf
        sudo -u postgres pg_ctl start -D /db
        sudo -u postgres createdb audius_creator_node
    else
        sudo -u postgres pg_ctl start -D /db
    fi

    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${postgres_password:-postgres}';"

    export dbUrl="postgres://postgres:${postgres_password:-postgres}@localhost:5432/audius_creator_node"
    export WAIT_HOSTS="localhost:5432"
    /usr/bin/wait
fi

if [[ "$devMode" == "true" ]]; then
    if [ "$link_libs" = true ]
    then
        cd ../audius-libs
        npm link
        cd ../app
        npm link @audius/libs
        ./node_modules/.bin/nodemon --watch src/ --watch ../audius-libs/ src/index.ts | tee >(logger) | ./node_modules/.bin/bunyan
    else
        ./node_modules/.bin/nodemon --watch src/ src/index.ts | tee >(logger) | ./node_modules/.bin/bunyan
    fi
else
    node build/src/index.js | tee >(logger)
    docker run -d --name watchtower -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --interval 10
fi

wait