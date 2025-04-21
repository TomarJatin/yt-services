# Use the official Node.js 16 image as a base image
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the Prisma schema file and generate Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application code
# Copy the service account JSON key
COPY src/storage/key.json /usr/src/app/service-account-key.json

# Set the environment variable for Google Cloud credentials
ENV GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/service-account-key.json
COPY . .

# Copy the .env file
COPY .env ./

# print env variables from .env file
RUN cat .env

# Build the NestJS application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080
ENV PORT 8080

# Start the NestJS application
CMD ["node", "dist/main.js"]