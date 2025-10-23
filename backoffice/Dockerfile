FROM --platform=linux/arm64 node:24.0.1-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM --platform=linux/arm64 node:24.0.1-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000

USER node

CMD ["npm","start"]