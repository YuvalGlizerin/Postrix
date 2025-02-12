# docker build -t yuvadius/joby:latest .
# docker push yuvadius/joby:latest
# docker run -p 8080:8080 -e ENV=local  yuvadius/joby:latest

# Use the official lightweight Node.js image.
# https://hub.docker.com/_/node
FROM --platform=linux/amd64 node:22.13.1-slim AS builder

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./
COPY tsconfig.json ./
COPY ./packages ../packages

# Install dependencies.
RUN npm install --production

# Build the application
RUN npm run build

FROM --platform=linux/amd64 node:22.13.1-slim

# Copy the rest of the application
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"]
