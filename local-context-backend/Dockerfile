FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies required for native modules (sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-slim

WORKDIR /app

# We need the built artifacts and the node_modules with native bindings
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Create the data directory for the SQLite store
RUN mkdir -p /data
ENV DATABASE_PATH=/data/context.db

# Expose the API port when we add a server
EXPOSE 3000

CMD ["npm", "start"]
