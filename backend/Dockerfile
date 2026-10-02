FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Install dependencies first so Docker caches this layer
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Uploads live outside src; the volume inherits this ownership
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "src/server.js"]