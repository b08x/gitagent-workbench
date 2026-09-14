# justfile
set shell := ["bash", "-c"]

default:
    @just --list

# ==========================================
# Install & Setup
# ==========================================

# Install all dependencies (Frontend and Backend)
install:
    echo "Installing frontend dependencies..."
    npm install
    echo "Installing backend dependencies..."
    cd local-context-backend && npm install

# Run type checks and linters
lint:
    echo "Linting frontend..."
    npm run lint
    echo "Linting backend..."
    cd local-context-backend && npx tsc --noEmit

# ==========================================
# Frontend Commands
# ==========================================

# Start the frontend development server
dev:
    npm run dev

# Build the frontend for production
build:
    npm run build

# Preview the frontend production build
preview:
    npm run preview

# ==========================================
# Backend Commands
# ==========================================

# Start the backend development server locally
backend-dev:
    cd local-context-backend && npm run dev

# Build the backend typescript
backend-build:
    cd local-context-backend && npm run build

# Start the backend API server locally (production mode)
backend-start:
    cd local-context-backend && npm start

# ==========================================
# Docker Compose Tasks
# ==========================================

# Start all services (frontend + context backend) via Docker Compose
up:
    docker-compose up -d

# Start all services and force a rebuild
up-build:
    docker-compose up -d --build

# View logs for all services
logs:
    docker-compose logs -f

# Stop all services
down:
    docker-compose down

# Stop all services and remove volumes (Wipes DB!)
clean:
    docker-compose down -v
    rm -rf node_modules dist
    rm -rf local-context-backend/node_modules local-context-backend/dist
