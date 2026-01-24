FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server/ ./server/

# Install TypeScript and tsx for running server
RUN npm install -g tsx

# Expose port
EXPOSE 3001

# Start server
CMD ["tsx", "server/index.ts"]
