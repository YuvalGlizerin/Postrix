# Build: docker build -t yuvadius/whatsapp:latest -f services/whatsapp/Dockerfile .
# docker push yuvadius/whatsapp:latest
# docker run -p 8081:8081 -e ENV=local yuvadius/whatsapp:latest

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
COPY services/whatsapp services/whatsapp/

# Copy all packages
COPY packages packages/

# Install dependencies that are only used by the service or its dependencies
RUN pnpm install --prod --frozen-lockfile --filter=whatsapp...

# Start the application
CMD ["pnpm", "--filter=whatsapp", "run", "start"]
