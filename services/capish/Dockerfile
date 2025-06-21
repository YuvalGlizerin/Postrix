# Build: docker build -t yuvadius/capish:latest -f services/capish/Dockerfile .
# docker push yuvadius/capish:latest
# docker run -p 8081:8081 -e ENV=local yuvadius/capish:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/arm64 node:24.0.1-slim

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Copy the service
COPY services/capish services/capish/

# Copy all packages
COPY packages packages/

# Install dependencies that are only used by the service or its dependencies
RUN npm ci --workspace=capish --omit=dev

# Start the application
CMD ["npm", "--prefix=services/capish", "run", "start"]
