FROM node:20-alpine AS builder
WORKDIR /app
RUN chown -R node:node /app
USER node
COPY package*.json ./
RUN npm ci
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY eslint.config.mjs ./
COPY next-env.d.ts ./
COPY playwright.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
