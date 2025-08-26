# Multi-stage build for production
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Start the application
CMD ["npm", "start"]
