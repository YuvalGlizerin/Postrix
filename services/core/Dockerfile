# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM node:20.11-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./
COPY tsconfig.json ./

# Install production dependencies.
RUN npm install --only=production

#RUN npm install -g typescript ts-node

# Copy local code to the container image.
COPY ./src ./src

# Start the application using ts-node, enabling the transpileOnly option for faster startup
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
