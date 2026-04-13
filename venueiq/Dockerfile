FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Bake Firebase + Gemini env vars directly into the build
# (NEXT_PUBLIC_ vars are inlined at build time by Next.js)
ENV NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAfJu3ozPePfpEKm5bb9H8c8ak1N1hv75E
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=venueiq-355b3.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=venueiq-355b3
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=venueiq-355b3.firebasestorage.app
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=88825829128
ENV NEXT_PUBLIC_FIREBASE_APP_ID=1:88825829128:web:782360cb7b679990b37ebd
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-5VXWPGFZKD
ENV NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyAZr8FBPV3LIUaCo4H7wqWTKqmPRcRa9Sw

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 80

ENV PORT=80
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
