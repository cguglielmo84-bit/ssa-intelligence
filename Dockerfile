# Multi-stage build for full app (backend + frontend)
# This does not change local dev; existing backend Dockerfile/docker-compose remain untouched.

FROM node:20-alpine AS backend-build
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend ./
# Generate Prisma client before build
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install bash for environments that invoke bash explicitly
RUN apk add --no-cache bash

# Backend artifacts
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package*.json ./backend/
COPY --from=backend-build /app/backend/prisma ./backend/prisma
COPY --from=backend-build /app/backend/prompts ./backend/prompts

# Frontend static build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Start script
COPY start-app.sh ./start-app.sh
RUN chmod +x ./start-app.sh

EXPOSE 3000

# Note: assumes backend handles serving the API (and optionally static frontend if configured in code)
CMD ["sh", "./start-app.sh"]