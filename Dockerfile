# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build arguments for environment variables
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json and install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy server code
COPY server ./server

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

EXPOSE 33110

ENV PORT=33110
ENV NODE_ENV=production

CMD ["node", "server/index.cjs"]
