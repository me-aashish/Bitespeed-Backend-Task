# Stage 1: Builder
FROM node:18-slim AS builder
WORKDIR /app

# Copy package files & install dependencies
COPY package*.json tsconfig.json ./ 
RUN npm install

# Copy source & generate Prisma client
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:18-slim AS runner
WORKDIR /app

# Copy production dependencies
COPY package*.json ./ 
RUN npm install --omit=dev

# Copy built code and Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Copy .env file for Prisma
COPY .env ./

EXPOSE 3000

# Set environment variable
ENV NODE_ENV=production

# Start the app (Prisma client will use DATABASE_URL from .env)
CMD ["node", "dist/server.js"]

CMD npx prisma migrate deploy && node dist/server.js
