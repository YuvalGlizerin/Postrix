# Build: docker build -t yuvadius/backoffice:latest -f services/backoffice/Dockerfile .
# docker push yuvadius/backoffice:latest
# docker run -p 3000:3000 -e ENV=local yuvadius/backoffice:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/arm64 node:24.0.1-slim AS build

# Install pnpm globally
RUN npm install -g pnpm@9.5.0

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy pnpm workspace configuration and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json postcss.config.mjs ./

# Copy the service
COPY services/backoffice services/backoffice/

# Copy all packages
COPY packages packages/

# Install dependencies that are only used by the service or its dependencies
RUN pnpm install --frozen-lockfile --filter=backoffice...

# Build the service
RUN pnpm --filter=backoffice run build

# From:https://hub.docker. using lightest node
FROM --platform=linux/arm64 node:24.0.1-slim

# Install pnpm globally
RUN npm install -g pnpm@9.5.0

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy pnpm workspace configuration and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy the service
COPY services/backoffice services/backoffice/

# Copy all packages
COPY packages packages/

# Install dependencies that are only used by the service or its dependencies for production
RUN pnpm install --prod --frozen-lockfile --filter=backoffice...

# Copy the built and static assets
COPY --from=build /usr/workspace/services/backoffice/.next services/backoffice/.next
COPY --from=build /usr/workspace/services/backoffice/public services/backoffice/public

# Expose the port the service runs on
EXPOSE 3000

# Use the node user
USER node

# Start the application
CMD ["pnpm", "--filter=backoffice", "run", "start"]