# Stage 1: Builder
# We use Alpine for a smaller, more secure base image
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies based on package-lock.json for reproducible builds
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the frontend (Vite builds into /dist)
RUN npm run build

# Stage 2: Runner
# This stage only contains the production assets to minimize image size and attack surface
FROM node:22-alpine AS runner

WORKDIR /app

# Set node environment to production
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install tsx globally to run the TypeScript server code securely and cleanly
RUN npm install -g tsx

# Copy the built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server source and TypeScript config needed for execution
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./

# Best practice: Do not run as root. The 'node' user is pre-created in official Node images.
USER node

# Expose the API and WebSocket port that Sketchpad uses
EXPOSE 8787

# Start the server
CMD ["npm", "run", "server"]
