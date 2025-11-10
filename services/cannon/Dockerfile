# Build: docker build -t yuvadius/cannon:latest -f services/cannon/Dockerfile .
# docker push yuvadius/cannon:latest
# docker run -p 8082:8082 -e ENV=local yuvadius/cannon:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/arm64 node:24.0.1-slim

# TODO: Examine this when prisma 7 is released
# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl

# Install pnpm globally
RUN npm install -g pnpm@9.5.0

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy pnpm workspace configuration and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy the service
COPY services/cannon services/cannon/

# Copy all packages
COPY packages packages/

# Install dependencies that are only used by the service or its dependencies
RUN pnpm install --prod --frozen-lockfile --filter=cannon...

# Start the application
CMD ["pnpm", "--filter=cannon", "run", "start"]
