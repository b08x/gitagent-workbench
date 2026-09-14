# Stage 1: Base image with dependencies (Optimized Caching)
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Stage 2: Development (Vite hot-reload)
FROM base AS dev
# Copy source only in this stage to keep base clean
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 3: Build production artifacts
FROM base AS build
# Build-time arguments for environment variables
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

COPY . .
RUN npm run build

# Stage 4: Final production image
FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
