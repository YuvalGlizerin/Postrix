# Build: docker build -t yuvadius/backoffice:latest -f backoffice/Dockerfile .
# docker push yuvadius/backoffice:latest
# docker run -p 3000:3000 -e ENV=local yuvadius/backoffice:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/arm64 node:24.0.1-slim AS build

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies that are only used by the service or its dependencies
RUN npm ci --workspace=backoffice

# Copy the service
COPY . .

# Build the service
RUN npm run build

# From:https://hub.docker. using lightest node
FROM --platform=linux/arm64 node:24.0.1-slim

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies that are only used by the service or its dependencies for production
RUN npm ci --workspace=backoffice --omit=dev

# Copy the built and static assets
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Expose the port the service runs on
EXPOSE 3000

# Use the node user
USER node

# Start the application
CMD ["npm","start"]