FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/buffet?schema=public
ENV DATABASE_URL=$DATABASE_URL

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN chown node:node /app
COPY --from=build --chown=node:node /app/.output ./.output
# Prisma CLI e migrations, para o comando de release `npx prisma migrate deploy`.
COPY --from=build --chown=node:node /app/package.json /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

# Aplica as migrations pendentes (nunca apaga dados) e só então sobe o servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node .output/server/index.mjs"]
