FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend

COPY backend ./backend

WORKDIR /app/backend

RUN npm run prisma:generate && npm run build

FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/src/i18n ./backend/src/i18n
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

WORKDIR /app/backend

CMD ["npm", "run", "start"]
