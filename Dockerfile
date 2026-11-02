# ==============================================================================
# readAday Backend - Production Dockerfile for Render
# ==============================================================================

FROM node:22-alpine AS runner

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package descriptors
COPY package*.json ./

# Install production and build dependencies
RUN npm ci

# Copy entire application source code
COPY . .

# Run build step
RUN npm run build

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port 3000 for Render Web Service
EXPOSE 3000

# Healthcheck for container runtimes
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the Express backend
CMD ["npm", "start"]
