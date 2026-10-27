FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl \
    && corepack enable \
    && corepack prepare pnpm@10.33.0 --activate

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN pnpm prisma:generate \
    && pnpm build \
    && pnpm prune --prod

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/index.js"]