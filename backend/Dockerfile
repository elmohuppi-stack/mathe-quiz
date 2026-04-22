FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
COPY package*.json ./

RUN npm install --workspace=backend

COPY backend ./backend

WORKDIR /app/backend

# Generate Prisma client
RUN npm run prisma:generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
