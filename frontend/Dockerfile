FROM node:20-alpine

WORKDIR /app

COPY frontend/package*.json ./frontend/
COPY package*.json ./

RUN npm ci --workspace=frontend

COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "dev"]
