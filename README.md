# Movie API

A read-only HTTP API over two SQLite databases (`db/movies.db`, `db/ratings.db`):
list movies, filter by year or genre, and fetch details with an average rating that is
computed across the two databases.

Node 24, TypeScript (strict), Express 5, Sequelize 6 + sqlite3, zod, pino, helmet, Jest + supertest.

## Quick start

### Docker

```bash
docker compose up --build        # API on http://localhost:3000
curl localhost:3000/health       # {"status":"ok"}
npm run docker:test              # run the test suite inside the container
docker compose down
```

The compose file mounts `./db` read-only. Set `PORT`, `LOG_LEVEL` or `DEFAULT_PAGE_SIZE` in your
shell or a `.env` file to override the defaults.

### Local

```bash
cp .env.example .env             # database paths, port, page size
npm install
npm run dev                      # tsx watch, http://localhost:3000
```

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Run from source with reload                   |
| `npm run build`     | Compile to `dist/`                            |
| `npm start`         | Run the compiled server                       |
| `npm run typecheck` | `tsc --noEmit` over `src` and `test`          |
| `npm test`          | Unit and e2e tests (e2e uses the real `db/`)  |

### Configuration (12-factor)

All configuration comes from environment variables, validated once at startup with zod. The process
refuses to start on invalid config, and `dotenv` is only loaded by `src/server.ts`.

| Variable            | Default       | Notes                                     |
| ------------------- | ------------- | ----------------------------------------- |
| `MOVIES_DB_PATH`    | required      | Path to `movies.db`                       |
| `RATINGS_DB_PATH`   | required      | Path to `ratings.db`                      |
| `PORT`              | `3000`        |                                           |
| `HOST`              | `0.0.0.0`     |                                           |
| `LOG_LEVEL`         | `info`        | pino level; `silent` in tests             |
| `DEFAULT_PAGE_SIZE` | `50`          | 1 to 500                                  |
| `NODE_ENV`          | `development` | `development`, `test` or `production`     |

Logs are structured JSON on stdout. `SIGTERM` and `SIGINT` stop the server and close both databases.

## API

| Method | Path                                  | Description                                    |
| ------ | ------------------------------------- | ---------------------------------------------- |
| GET    | `/health`                             | 200 `{"status":"ok"}` or 503 (`SELECT 1` on both DBs) |
| GET    | `/movies?page=`                       | All movies                                     |
| GET    | `/movies/year/:year?page=&sort=`      | Movies released in a year, sorted by release date |
| GET    | `/movies/genre/:genre?page=`          | Movies in a genre                              |
| GET    | `/movies/:imdbId`                     | Movie details with average rating              |

List endpoints share one envelope: `{ data, page, pageSize, total, totalPages }`. `page` is an
integer >= 1 (default 1). `sort` is `asc` (default) or `desc`. A page past the end is a 200 with
empty `data`.

### List all

```bash
curl 'localhost:3000/movies?page=1'
```

```json
{
  "data": [
    {
      "imdbId": "tt0094675",
      "title": "Ariel",
      "genres": ["Drama", "Crime"],
      "releaseDate": "1988-10-21",
      "budget": null
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 45430,
  "totalPages": 909
}
```

(`data` is trimmed to one item here and below.)

### By year

```bash
curl 'localhost:3000/movies/year/1995?sort=desc'
```

```json
{
  "data": [
    {
      "imdbId": "tt0114746",
      "title": "Twelve Monkeys",
      "genres": ["Science Fiction", "Thriller", "Mystery"],
      "releaseDate": "1995-12-29",
      "budget": "$29,500,000"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 598,
  "totalPages": 12
}
```

### By genre

Case-insensitive and whitespace-tolerant, and slugs work: `Science Fiction`, `science fiction` and
`science-fiction` are equivalent.

```bash
curl 'localhost:3000/movies/genre/science-fiction'
```

```json
{
  "data": [
    {
      "imdbId": "tt0076759",
      "title": "Star Wars",
      "genres": ["Adventure", "Action", "Science Fiction"],
      "releaseDate": "1977-05-25",
      "budget": "$11,000,000"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 3042,
  "totalPages": 61
}
```

### Details

```bash
curl 'localhost:3000/movies/tt0181852'
```

```json
{
  "imdbId": "tt0181852",
  "title": "Terminator 3: Rise of the Machines",
  "genres": ["Action", "Thriller", "Science Fiction"],
  "releaseDate": "2003-07-02",
  "budget": "$200,000,000",
  "description": "It's been 10 years since John Connor saved Earth from Judgment Day, ...",
  "runtime": 109,
  "averageRating": 4.26,
  "originalLanguage": null,
  "productionCompanies": ["Columbia Pictures", "Intermedia Films", "Warner Bros.", "..."]
}
```

`averageRating` is the mean rounded to 2 decimals, or `null` when the movie has no ratings.

### Errors

Every error has the same shape and never includes a stack trace.

| Status | `code`             | When                                                    |
| ------ | ------------------ | ------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | Bad `page`, `sort`, `year`, blank genre, malformed `imdbId` |
| 404    | `NOT_FOUND`        | Unknown `imdbId` or unknown route                       |
| 500    | `INTERNAL_ERROR`   | Anything unexpected (logged server-side)                |

```bash
curl -i 'localhost:3000/movies/year/95'      # 400
curl -i 'localhost:3000/movies/tt9999999'    # 404
```

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "year: must be a 4-digit year" } }
{ "error": { "code": "NOT_FOUND", "message": "Movie tt9999999 not found" } }
```

## Architecture

```
src/
  server.ts        entrypoint: dotenv, loadConfig, buildContainer, listen, graceful shutdown
  container.ts     composition root: the only place concrete classes are wired together
  app.ts           createApp(deps): builds the Express app; never listens, never reads process.env
  config/          loadConfig(env): zod-validated, frozen
  database/        two Sequelize instances, opened read-only, authenticated at startup
  movies/          model, repository, service, controller, routes, mapper, schemas, types
  ratings/         model, repository
  common/          errors, pagination, middleware (validate, error-handler)
test/
  unit/            service (mocked repositories), mapper, schemas, pagination, config
  e2e/             supertest against the real db/ files, no .env
```

A request flows one way:

```
route -> validate (zod) -> controller -> service -> repository -> Sequelize
                                           |
                                           +-> mapper (row -> API shape)
```

- **Controllers** read validated input and call the service. They are arrow-function properties so
  they can be passed straight to the router. Express 5 forwards rejected promises to the error
  middleware, so there is no async wrapper.
- **Services** hold the logic (cross-database rating lookup, rounding, 404s) and depend on
  repository *interfaces*, so unit tests pass plain mocks.
- **Repositories** are the only code that imports Sequelize (besides the models and
  `database/`). They return plain rows, not model instances.
- **Mapper** converts rows to API types. It tolerates nulls and malformed JSON.
- **Validation** parses `params` and `query` with zod. Express 5 makes `req.query` read-only, so
  parsed values travel via `res.locals` and controllers read them with `validated<T>()`.

### Adding an endpoint

1. **Types**: add the API shape (and a row type if it reads new columns) to `movies/movie.types.ts`.
2. **Schema**: add a zod schema for its params or query in `movie.schemas.ts`.
3. **Repository**: add a method to the `MovieRepository` interface and implement it in
   `SequelizeMovieRepository`. For paged lists, call `queryPage` with a `where` and `order`.
4. **Service**: add a method that calls the repository and maps rows. Wrap lists with `toPaginated`.
5. **Controller**: add an arrow-function property that reads `validated(...)` and calls the service.
6. **Route**: register it in `movie.routes.ts` with `validate(...)` middleware. Keep
   `/:imdbId` last, otherwise it swallows fixed-prefix routes.
7. **Tests**: unit-test the service with mocked repositories, and e2e-test the happy path,
   pagination, 400s and 404s.

Nothing else needs touching: `container.ts` already injects the service into the controller.

## Decisions and tradeoffs

**Express rather than NestJS.** The API is four read-only endpoints. Express 5 plus a hand-written
composition root keeps the wiring visible in one short file, with no decorators or module system to
learn. The layering (controller, service, repository) is the same one Nest would impose, so moving
later is mostly mechanical.

**Sequelize behind repositories.** Sequelize was a given, and it is kept at the edge: services see
repository interfaces and plain row types, so they are tested without a database and the ORM could be
replaced without touching business logic. Models use `raw: true` queries and select only the columns
each endpoint needs.

**Two Sequelize instances rather than `ATTACH`.** The data lives in two files, so each gets its own
read-only connection and its own repository. That keeps ownership clear and means a ratings store
could move elsewhere without changing the movie queries. The cost is that there is no cross-database
join: details does two lookups (movie by `imdbId`, then ratings by `movieId`). `ATTACH DATABASE`
would allow a single join but ties both files to one connection and makes the repository boundary
blurry. For one lookup per request, two queries are simpler.

**A SQL fragment for genre.** Genres are JSON text (`[{"id":18,"name":"Drama"}]`), which Sequelize
cannot query through its normal `where` helpers. The filter is a literal
`EXISTS (SELECT 1 FROM json_each(Movie.genres) WHERE lower(json_extract(value,'$.name')) = :genre)`
with the value bound through `replacements`. The fragment is a constant; user input never reaches the
SQL text. The schema normalizes the genre (lower-case, slugs to spaces, trimmed), and matching is
exact, so `sci` does not match `Science Fiction`.

**Date range rather than `strftime`.** `releaseDate` is `YYYY-MM-DD` text, so the year filter is
`>= 'YYYY-01-01' AND < 'YYYY+1-01-01'` on the raw column. It is exact, it avoids a function call per
row, and it is index-friendly once an index exists.

**Smaller choices.**
- Read-only connections (`OPEN_READONLY`), no `sync()`, and no migrations. The API cannot modify data.
- Sort direction goes through a whitelist lookup, never interpolation, and sorting breaks ties on
  `movieId` so pages are stable.
- `/health` runs `SELECT 1` on both databases and answers 503 on failure, so the Docker healthcheck
  reflects real readiness.
- The Docker image uses `node:24-trixie-slim`: the prebuilt `sqlite3` 6.x binary needs glibc 2.38 or
  newer, which Debian bookworm does not have. It runs as the non-root `node` user and ships only
  production dependencies.

## Assumptions and data notes

- **Budget `0` or `null` becomes `null`.** The data uses `0` for "unknown" (about 80% of rows), so it
  is reported as unknown rather than as `$0`. Other budgets are formatted as USD, e.g. `$4,000,000`.
- **Unknown genre returns 200 with an empty list**, not 404. A genre is a filter, not a resource. A
  blank genre (`/movies/genre/%20`) is a 400.
- **A year with no movies returns 200 with an empty list.**
- **`imdbId` must look like `tt` plus digits**, otherwise 400. Every non-empty id in the data matches.
- **Ratings are matched by `movieId`**, as specified. In this dataset the two databases do not share
  an id space: only 2,830 of the 9,066 rated ids exist in `movies`, and some of those belong to
  different films (id 296 is *Terminator 3* here, with 324 ratings that look like they belong to
  another title). Treat `averageRating` as correct to the spec but not necessarily to reality.
- **`originalLanguage` is always `null`**, because the `language` column is empty in all 45,430 rows.
- Some rows have an empty `imdbId` or `releaseDate`. They appear in the plain list, cannot be fetched
  by id, and are excluded from year queries.
- Averages are rounded half-up to 2 decimals.

## Next steps

- **Indexes** (needs a writable copy or a build step, since the databases are read-only here):
  `movies(imdbId)` for details, `movies(releaseDate)` for year queries, `ratings(movieId)` for
  averages. Today each of these is a table scan, and genre filtering will stay a scan until genres
  are normalized into their own table.
- **Caching**: the data is immutable, so responses can carry `Cache-Control` and `ETag`, with an
  in-process LRU or a CDN in front for hot lists and rating averages.
- **OpenAPI**: generate a spec from the zod schemas and serve it with a docs UI.
- **Rate limiting**: per-IP limits at the edge or with `express-rate-limit`.
- **CI**: GitHub Actions running `typecheck`, `test` and `docker build` on every push.
- **AWS deployment**: push the image to ECR and run it on ECS Fargate behind an ALB, using `/health`
  as the target-group check, with config from SSM Parameter Store and logs to CloudWatch. The
  databases would sit on a read-only volume (EFS) or be baked into the image, since they are
  immutable.
