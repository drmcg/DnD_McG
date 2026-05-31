# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifest for better caching
COPY package*.json ./

# Use npm ci when a lockfile is present for reproducible installs
RUN if [ -f package-lock.json ]; then \
  npm ci --silent; \
  else \
  npm install --silent; \
  fi

# Copy source and build the web app
COPY . .
RUN npm run build --if-present

# Runtime stage
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production

# Copy only built assets and necessary runtime files
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY package*.json ./

# Install production dependencies only
RUN if [ -f package-lock.json ]; then \
  npm ci --only=production --silent; \
  else \
  npm install --only=production --silent; \
  fi

EXPOSE 5173
CMD ["node", "server.js"]
