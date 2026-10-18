# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands
- Setup: `cp .env.example .env` (set `DB_PASSWORD`), then `npm run db:init` (idempotent; creates DB/tables/seed data and migrates old DBs). Requires a running MySQL/MariaDB.
- Dev: `npm run dev:all` (Vite :5173 + API :3001 with `node --watch`). Vite proxies `/api` to `PORT` from `.env` ([`vite.config.js`](vite.config.js)).
- Prod: `npm run build` then `NODE_ENV=production JWT_SECRET=<random> npm start` — Express serves `dist/` and `/api` on one port.
- Tests: Vitest in `tests/` (DB is mocked with `vi.mock`, no MySQL needed). All: `npm test`; one file: `npx vitest run tests/server/images.test.js`; one test: `npx vitest run -t "nombre de la prueba"`; coverage + thresholds (vitest.config.js): `npm run test:ci`. No linter/formatter configured.
- Coverage only counts files listed in `vitest.config.js` `coverage.include` — add new testable modules there. SonarCloud reads `coverage/lcov.info` (JaCoCo is Java-only, not used).
- CI/CD: `.github/workflows/ci-cd.yml` (test → sonarcloud + snyk → build image → docker compose validate → GHCR publish → staging deploy). Needs secrets `SONAR_TOKEN`, `SNYK_TOKEN`. Course constraints: no AWS, no Kubernetes, no Dependabot; orchestration is `docker-compose.yml` (db, db-init, api xN, nginx lb). Compose vars live in `.env.docker` (see `.env.docker.example`).
- `/api/health` returns `commit` from `GIT_SHA` (Dockerfile build-arg); the deploy job compares it with the pipeline SHA — keep that contract.
- [`CUMPLIMIENTO_EP2.md`](CUMPLIMIENTO_EP2.md) is the EP2 evaluation document (Spanish) mapping IE1–IE5 to those files; update it when the pipeline changes.

## Architecture
- ESM everywhere (`"type": "module"`): server imports need the `.js` extension (`'../lib/http.js'`); client imports of components/pages omit it.
- Plain JavaScript/JSX (no TypeScript). UI text, error messages, comments, and DB table/column names are in Spanish (`usuarios`, `pedidos`, `nombre`, `precio`); keep that.
- Server: `server/routes/*.js` (one Router per resource, mounted in [`server/index.js`](server/index.js)), `server/lib/` helpers, `server/middleware/auth.js`.
- Client: `src/context/{AuthContext,StoreContext}.jsx` hold session/cart/products; `src/lib/api.js` is the only fetch wrapper.

## Server conventions (non-obvious)
- Express 4: every async handler MUST be wrapped in `asyncHandler` ([`server/lib/http.js`](server/lib/http.js)). Throw `new HttpError(status, message, { field })` — the central error handler in `server/index.js` turns it into `{ message, field }` JSON. Don't `res.status(...).json(...)` errors by hand.
- Protect routes with `...requireRole('admin', 'vendedor')` (it's an array — spread it). `requireAuth` re-reads the user from MySQL on every request, so role changes apply immediately; don't cache `req.user`.
- Validation lives in [`server/lib/validators.js`](server/lib/validators.js) (`cleanUser`, `cleanProduct`, `cleanOrderItems`). It deliberately DUPLICATES [`src/lib/validators.js`](src/lib/validators.js) (RUN check digit, email domains `gmail.com`/`duoc.cl`/`profesor.duoc.cl`, password 4–10 chars, length limits). Change both together.
- Never trust client prices: order totals are computed from DB prices. Orders store snapshot copies of name/RUT/price/phone; products/users can be deleted without affecting history (`producto_id` becomes NULL).
- Multi-step writes use `withTransaction(async conn => ...)` from `server/db.js`; images validated (`checkImageRef`) before opening the transaction.
- Images: uploaded as base64 data URLs, MIME sniffed from magic bytes, stored in MySQL table `imagenes`, referenced as `/api/imagenes/ID`; call `purgeOrphanImages(conn)` after updates/deletes of products. Max 3 MB per image, 15 MB JSON body, gallery max 6.
- Schema changes: update both [`server/schema.sql`](server/schema.sql) and the migration logic in `server/init-db.js` (db:init must stay re-runnable on old DBs).
- `JWT_SECRET`: in production the server exits if it's missing or equals the example value; in dev a missing one gives random per-restart secrets (sessions drop on restart).

## Client conventions
- Always call the API through `api(path, { method, body })` from `src/lib/api.js`; it adds the Bearer token, throws `ApiError(message, status, field)` (use `field` to map errors onto form inputs), and dispatches `UNAUTHORIZED_EVENT` on 401 with a token.
- `localStorage` access goes through `src/lib/storage.js` / `api.js` helpers (all try/catch-guarded). Only the cart, token and session copy live there; products/orders/users come from the API.
- Role gating in routes uses `<RequireRole roles={[...]}>` in [`src/App.jsx`](src/App.jsx); mirror any server role change there (`admin`, `vendedor`, `cliente`).
- Forms use `useForm` with rule maps from `src/lib/validators.js` (`REGISTER_RULES`, `PRODUCT_RULES`, ...; `LINKED_FIELDS` re-validates confirm fields). Rules return `''` when valid, otherwise the error message.

## Style (inferred, no config files)
- 2-space indent, single quotes, semicolons, arrow functions, trailing commas absent, `const`/named exports; default export for routers, pages and components.
