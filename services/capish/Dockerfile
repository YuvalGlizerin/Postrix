# Local Build: docker build --platform linux/arm64 -t yuvadius/capish:latest -f services/capish/Dockerfile .
# Server Build: docker build --platform linux/amd64 -t yuvadius/capish:latest -f services/capish/Dockerfile .
# docker push yuvadius/capish:latest
# docker run -p 8080:8080 -e ENV=local yuvadius/capish:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM node:23.10.0-slim

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Copy the service
COPY services/capish services/capish/

# Copy all packages
COPY packages packages/

# Install dependencies
RUN npm ci --omit=dev && npm ci --workspaces --omit=dev

# Start the application
CMD ["npm", "--prefix=services/capish", "run", "start:server"]
