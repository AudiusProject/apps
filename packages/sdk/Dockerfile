FROM node:22-alpine as base

ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM

ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

# PRUNE DEPENDENCIES
FROM base AS builder

RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
RUN npm install turbo@1.10.14 --global

COPY . .
RUN turbo prune --scope=@audius/sdk --docker

# INSTALL & BUILD
FROM base AS installer

WORKDIR /app

RUN apk add --no-cache python3 py3-pip make g++ bash libc6-compat
RUN apk update

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
COPY --from=builder /app/scripts ./scripts

RUN CI=true npm i

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN npx turbo run build --filter=@audius/sdk

ARG git_sha
ENV GIT_SHA=$git_sha

WORKDIR /app/packages/sdk
