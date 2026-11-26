FROM node:24.10.0-alpine AS base

FROM base AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app
RUN npm install turbo@1.10.14 --global

COPY . .
RUN turbo prune --scope=@audius/mcp --docker

FROM base AS installer

WORKDIR /app

RUN apk add --no-cache python3 py3-pip make g++ bash libc6-compat

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/patches/zod-to-json-schema+3.25.2.patch ./patches/

RUN CI=true npm i

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN npx turbo run build --filter=@audius/mcp

WORKDIR /app/packages/audius-mcp

ENV NODE_ENV=production
ENV PORT=3333
EXPOSE 3333

CMD ["node", "dist/index.js"]
