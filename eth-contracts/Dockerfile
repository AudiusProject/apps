# Uses separate stage for nodejs deps despite caching to avoid installing build tools
FROM node:18.16 AS builder
COPY package*.json ./
RUN npm ci

FROM node:18-slim

WORKDIR /usr/src/app

COPY --from=builder package*.json ./
COPY --from=builder /node_modules ./node_modules

COPY ./contracts ./contracts
COPY ./migrations ./migrations 
COPY ./scripts ./scripts 
COPY ./utils ./utils
COPY ./test ./test
COPY ./patches ./patches
COPY ./truffle-config.js ./contract-config.js .solcover.js ./

# Some of the build tools for truffle require these to exist, and so does one
# of our migrations (for the .audius one). Since we run this as a non-root user
# in CI, make these in the construction of the container or we won't have access
# to be able to make them
RUN mkdir /.audius
RUN mkdir /.config
RUN touch /.babel.json

RUN chmod 777 /.audius
RUN chmod 777 /.config
RUN chmod 777 /.babel.json

RUN chmod +x ./scripts/setup-predeployed-ganache.sh ./scripts/setup-dev.sh

# runs openzeppelin patches
RUN npm run postinstall

RUN ./scripts/setup-predeployed-ganache.sh /usr/db 1000000000000

ARG CONTENT_NODE_VERSION
ARG DISCOVERY_NODE_VERSION
ARG VALIDATOR_VERSION

RUN ./scripts/setup-dev.sh /usr/db 1000000000000

HEALTHCHECK --interval=5s --timeout=5s --retries=10 \
    CMD node -e "require('http').request('http://localhost:8545').end()" || exit 1

CMD ["npx", "ganache", "--server.host", "0.0.0.0", "--database.dbPath", "/usr/db", "--wallet.deterministic", "--wallet.totalAccounts", "50", "--chain.networkId", "1000000000000"]
