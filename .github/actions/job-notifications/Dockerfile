# Build: docker build -t yuvadius/job-notifications:latest -f .github/actions/job-notifications/Dockerfile .
# docker push yuvadius/job-notifications:latest
# docker run -p 8081:8081 -e ENV=local yuvadius/job-notifications:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/arm64 node:24.0.1-slim

# Set up the workspace directory and cd into it
WORKDIR /usr/workspace

# Copy the root package.json and package-lock.json
COPY ../../../package.json ../../../package-lock.json ./

# Copy the service
COPY .github/actions/job-notifications .github/actions/job-notifications/

# Copy all packages
COPY packages packages/

# Install dependencies that are only used by the service or its dependencies
RUN npm ci --workspace=job-notifications --omit=dev

# Start the application
CMD ["npm", "--prefix=job-notifications", "run", "start"]
