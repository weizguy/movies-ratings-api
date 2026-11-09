# ---- base: shared so the native sqlite3 module matches the runtime OS (needs glibc >= 2.38) ----
FROM node:24-trixie-slim AS base
WORKDIR /app

# ---- deps: all dependencies, for building and testing ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile TypeScript to dist/ ----
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- test: run the test suite inside the container ----
FROM deps AS test
COPY . .
CMD ["npm", "test"]

# ---- prod-deps: runtime dependencies only ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: small final image, non-root ----
FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    MOVIES_DB_PATH=/app/db/movies.db \
    RATINGS_DB_PATH=/app/db/ratings.db
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY db ./db
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]