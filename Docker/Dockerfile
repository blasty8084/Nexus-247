# ===============================
# 🚀 Cosmic-Dashboard V6.8.5
# Production Container (Node 22 + PWA)
# ===============================
FROM node:22-alpine AS build

WORKDIR /app
ENV NODE_ENV=production

# Copy dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source files
COPY . .

# Build public assets (if applicable)
RUN npm run build || echo "No build step"

# ===============================
# 🧱 Final Image
# ===============================
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built app
COPY --from=build /app /app

# Add entrypoint
COPY docker/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose dashboard port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]