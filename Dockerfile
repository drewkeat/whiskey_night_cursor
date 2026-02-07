# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including dev for build and Prisma)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client and build Next.js
RUN npx prisma generate && npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/postcss.config.mjs ./

# Install production deps + Prisma CLI (for migrate deploy at runtime)
RUN npm ci --omit=dev && npm install prisma && npx prisma generate

USER nextjs

EXPOSE 3000

# Run migrations then start the server (postgres is available via depends_on)
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start"]
