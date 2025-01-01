# docker build -t yuvadius/core:latest .
# docker push yuvadius/core:latest
# docker run -p 8080:8080 -e ENV=local  yuvadius/core:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/amd64 node:20.11-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies.
RUN npm install

# Copy the rest of the application
COPY . .

# Make sure ts-node is installed globally
RUN npm install -g typescript ts-node

# Expose the port
EXPOSE 8080

# Start the application using ts-node, enabling the transpileOnly option for faster startup
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
