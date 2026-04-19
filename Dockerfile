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

# Stage 4: Final production image (Security: Non-root)
FROM nginxinc/nginx-unprivileged:stable-alpine
# Copy custom nginx config for SPA routing (listens on 8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy build artifacts from stage 3
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
