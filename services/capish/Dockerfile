# Local Build: docker build --platform linux/arm64 -t yuvadius/capish:latest -f services/capish/Dockerfile .
# Server Build: docker build --platform linux/amd64 -t yuvadius/capish:latest -f services/capish/Dockerfile .
# docker push yuvadius/capish:latest
# docker run -p 8080:8080 -e ENV=local yuvadius/capish:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM node:22.13.1-slim AS builder

# Set up the workspace structure
WORKDIR /usr/workspace

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy all packages
COPY packages packages/

# Copy the service
COPY services/capish services/capish/

# Install dependencies, build, and remove dev dependencies
WORKDIR /usr/workspace
RUN npm ci
RUN npm run build
# RUN cd services/capish && npm prune --production

# Production image
FROM node:22.13.1-slim

# Create and set working directory
WORKDIR /usr/workspace/services/capish

# Copy package.json files needed for running the application
COPY --from=builder /usr/workspace/services/capish/package*.json ./
COPY --from=builder /usr/workspace/services/capish/dist ./dist

# Copy the complete node_modules from workspace root
COPY --from=builder /usr/workspace/node_modules ../../node_modules

# Copy the entire packages folder so that local dependencies are intact
COPY --from=builder /usr/workspace/packages ../../packages

# Copy environment files
COPY services/capish/envs ./envs


# Expose the port
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start:server"]
