# Build: docker build -t yuvadius/whatsapp:latest -f services/whatsapp/Dockerfile .
# docker push yuvadius/whatsapp:latest
# docker run -p 8081:8081 -e ENV=local yuvadius/whatsapp:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/arm64 node:24.0.1-slim

# TODO: Examine this when prisma 7 is released
# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Copy the service
COPY services/whatsapp services/whatsapp/

# Copy all packages
COPY packages packages/

# Install dependencies that are only used by the service or its dependencies
RUN npm ci --workspace=whatsapp --omit=dev

# Start the application
CMD ["npm", "--prefix=services/whatsapp", "run", "start"]
