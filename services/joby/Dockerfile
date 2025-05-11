# Local Build: docker build --platform linux/arm64 -t yuvadius/joby:latest -f services/joby/Dockerfile .
# Server Build: docker build --platform linux/amd64 -t yuvadius/joby:latest -f services/joby/Dockerfile .
# docker push yuvadius/joby:latest
# docker run -p 8080:8080 -e ENV=local yuvadius/joby:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM node:24.0.1-slim

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Copy the service
COPY services/joby services/joby/

# Copy all packages
COPY packages packages/

# Install dependencies
RUN npm ci --omit=dev

# Start the application
CMD ["npm", "--prefix=services/joby", "run", "start:server"]
