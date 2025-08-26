# Multi-stage build for the Engagement Dashboard
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies (include dev dependencies for building)
RUN npm ci
RUN cd client && npm ci

# Build the application
FROM base AS builder
WORKDIR /app

# Copy source code and dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .

# Set environment variables for production
ENV NODE_ENV=production

# Build the client
RUN cd client && npm run build

# Build the server
RUN npm run build

# Production dependencies stage
FROM base AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Production image
FROM base AS runner
WORKDIR /app

# Install sqlite3 for production
RUN apk add --no-cache sqlite

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 dashboard

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create database directory with proper permissions
RUN mkdir -p /app/data && chown -R dashboard:nodejs /app/data

# Switch to non-root user
USER dashboard

# Ensure data directory is writable
RUN touch /app/data/.keep

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/engagement.db

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/server.js"]