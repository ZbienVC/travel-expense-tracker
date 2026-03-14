# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Build backend and frontend
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma
COPY prisma ./prisma

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server/index.js"]
