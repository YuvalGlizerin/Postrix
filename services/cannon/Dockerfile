# Local Build: docker build --platform linux/arm64 -t yuvadius/cannon:latest -f services/cannon/Dockerfile .
# Server Build: docker build --platform linux/amd64 -t yuvadius/cannon:latest -f services/cannon/Dockerfile .
# docker push yuvadius/cannon:latest
# docker run -p 8082:8082 -e ENV=local yuvadius/cannon:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM node:23.10.0-slim

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Copy the service
COPY services/cannon services/cannon/

# Copy all packages
COPY packages packages/

# Install dependencies
RUN npm ci --omit=dev

# Start the application
CMD ["npm", "--prefix=services/cannon", "run", "start:server"]
