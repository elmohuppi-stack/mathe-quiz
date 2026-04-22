FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./backend/
COPY package*.json ./

RUN npm install --workspace=backend

COPY backend ./backend

WORKDIR /app/backend

# Generate Prisma client
RUN npm run prisma:generate

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:push && npm run dev"]
