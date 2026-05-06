# syntax=docker/dockerfile:1.7
# Build context: project root. Source lives in ./src.

ARG NODE_VERSION=22

# --- deps: install node_modules from the lockfile ---
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY src/package.json src/package-lock.json ./
RUN npm ci

# --- builder: compile the Next.js app ---
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./
RUN npm run build

# --- runner: minimal production image ---
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/static_site ./static_site

USER app
EXPOSE 3000
CMD ["npx", "next", "start"]
