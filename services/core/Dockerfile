# Use the official Node.js 20 image as a parent image
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy the file from your host to your current location.
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy the rest of your app's source code from your host to your current location.
COPY . .

# Run the command inside your image filesystem.
CMD [ "npm", "start" ]
