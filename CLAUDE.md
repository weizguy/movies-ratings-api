# Movie API — Project Spec

## Context
Take-home coding challenge for a senior Node.js backend role. Reviewers will read
this code closely in a 1-hour code review. Priorities, in order: clean structure,
design patterns, testability, 12-Factor config/deployment, then feature completeness.
Readable, idiomatic code beats clever code. Do not over-engineer.

## Stack (decided — do not change)
- Node 24, TypeScript 6 (strict), CommonJS output
- Express 5 (async errors propagate to error middleware; no asyncHandler wrapper)
- Sequelize 6 + sqlite3, two separate Sequelize instances, opened READ-ONLY
- zod for config and request validation
- pino + pino-http for structured logging to stdout
- helmet
- Jest + ts-jest + supertest
- Docker multi-stage build + docker compose

## Existing files — inspect before writing, keep unless they conflict with this spec
tsconfig.json (noEmit, base), tsconfig.build.json (rootDir src, outDir dist),
package.json scripts, Dockerfile, docker-compose.yml, .dockerignore,
src/config/index.ts, src/app.ts, src/container.ts, src/database/index.ts,
src/movies/movie.model.ts, src/ratings/rating.model.ts, src/movies/movie.types.ts

## Architecture
src/
  app.ts          createApp(deps) — never calls listen, never reads process.env
  server.ts       dotenv/config, loadConfig, buildContainer, listen on HOST/PORT, SIGTERM → close server + DBs
  container.ts    composition root; constructor injection everywhere
  config/         loadConfig(env = process.env) with zod; frozen camelCase Config
  database/       initDatabases(config); authenticate() both at startup
  movies/         model, repository, service, controller, routes, mapper, schemas, types
  ratings/        model, repository
  common/         errors.ts, pagination.ts, middleware/{validate,error-handler}.ts
test/
  unit/           services (mocked repositories), mapper, pagination, config
  e2e/            supertest against real db/ files via testConfig helper (no .env)

Layer rules:
- Controllers: parse validated input → call service → send response. Arrow-function properties.
- Services: business logic; depend on repository interfaces, not Sequelize.
- Repositories: the ONLY place Sequelize is imported (besides models/database).
- Mapper: DB row → API type. Handles all nulls and bad JSON safely.

## Database facts (read-only — never modify db/ files, never call sync())
movies(movieId INTEGER PK, imdbId TEXT NOT NULL, title TEXT NOT NULL, overview TEXT,
  productionCompanies TEXT /*JSON [{name,id}]*/, releaseDate TEXT /*YYYY-MM-DD*/,
  budget INTEGER /*whole dollars, 0 = unknown*/, revenue INTEGER, runtime REAL,
  language TEXT, genres TEXT /*JSON [{id,name}]*/, status TEXT)
ratings(ratingId INTEGER PK, userId INTEGER, movieId INTEGER /*→ movies.movieId*/,
  rating REAL /*0.5–5*/, timestamp INTEGER)
No indexes besides PKs. Sequelize alias for movies is `Movie`.
Genres (20, title case): includes "Science Fiction" and "TV Movie".

## Endpoints & behavior
GET /health                         → 200 {status:"ok"} or 503 (SELECT 1 on both DBs)
GET /movies?page=                   → list all
GET /movies/year/:year?page=&sort=  → filter by year, sorted by releaseDate
GET /movies/genre/:genre?page=      → filter by genre
GET /movies/:imdbId                 → details (REGISTER THIS ROUTE LAST)

List item fields: imdbId, title, genres (string[]), releaseDate, budget
Details fields: list fields + description (overview), runtime, averageRating,
  originalLanguage, productionCompanies (string[])

Decisions:
- Pagination: page integer ≥ 1, default 1; page size from config (default 50).
  Response: { data, page, pageSize, total, totalPages }
- Budget: format as USD "$4,000,000" (Intl.NumberFormat, 0 decimals); 0 or null → null
- Year: 4-digit, validated; filter with a date RANGE (>= 'YYYY-01-01' AND < next year), not a function on the column
- Sort: whitelist asc|desc, default asc; never interpolate into SQL
- Genre: case-insensitive, trimmed; also accept slugs (science-fiction → science fiction);
  filter in SQL via json_each literal with `replacements` (never string interpolation);
  unknown genre → 200 with empty data
- Average rating: look up movie by imdbId, then ratings by its movieId; AVG rounded to 2 decimals; no ratings → null
- Errors: { error: { code, message } }; 400 validation, 404 not found, 500 generic (no stack traces)

## Working rules
- Work one phase at a time. STOP at the end of each phase and summarize what you did.
- Before each commit: npm run typecheck and npm test must pass.
- Small conventional commits (feat:, test:, chore:, docs:).
- Do not add dependencies beyond the stack above without asking.
- No `any`. No commented-out code. No speculative abstractions.
- Every endpoint gets unit tests (service) and e2e tests (happy path, pagination, 400s, 404s).