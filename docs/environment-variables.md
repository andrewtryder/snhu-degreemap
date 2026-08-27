# Environment Variable Reference for SNHU Degree Map

## Required Environment Variables

| Variable Name | Context / Location | Description |
| :--- | :--- | :--- |
| **`POSTGRES_URL`** | Vercel (Production & Preview), CircleCI, local Aiven validation | Standard PostgreSQL connection string. The Next.js runtime uses a shared `pg.Pool` with `max: 1` and Vercel `attachDatabasePool()` lifecycle management. Long-running CLI jobs (`db:migrate`, `program:bootstrap`, `program:sync`) use short-lived `pg.Client` connections with the same verified TLS settings. CircleCI synchronization jobs may use a direct (non-pooled) connection string by setting `POSTGRES_URL` in that context. Both Vercel **Production** and **Preview** environments must have a valid `POSTGRES_URL` configured if preview deployments are expected to display live catalog data (without `POSTGRES_URL`, production runtime gates disable fixtures and return empty program sets). |
| **`KUALI_BASE_URL`** | All Environments | Base URL for SNHU Kuali API (`https://snhu.kuali.co`). |
| **`KUALI_CATALOG_ID`** | All Environments | Active SNHU catalog UUID (`6349a3f9164d00001c6c80da`). |
| **`KUALI_REQUEST_TIMEOUT_MS`** | Sync CLI | Request timeout in milliseconds (default: `10000`). |
| **`KUALI_USER_AGENT`** | Sync CLI | Descriptive HTTP User-Agent string. |
| **`REVALIDATE_SECRET`** | Vercel & CircleCI | Secret token protecting `POST /api/revalidate`. Must be set identically in Vercel and the CircleCI context. |
| **`SITE_URL`** | CircleCI | Production application base URL (e.g. `https://snhu-degreemap.vercel.app`) used by CircleCI for revalidation triggers. When a custom domain is adopted, set this to the preferred HTTPS origin. |
| **`NEXT_PUBLIC_SITE_URL`** | Client & Server | Preferred production origin for canonical metadata, sitemap/robots URLs, JSON-LD, and production hostname redirects (www / http / `*.vercel.app` → this host). Preview deployment hosts are rejected. |

## Optional Environment Variables

| Variable Name | Context / Location | Description |
| :--- | :--- | :--- |
| **`POSTGRES_CA_CERT`** | Vercel, CircleCI, local Aiven validation | Verified TLS for managed PostgreSQL. Accepts an inline PEM string or a filesystem path (for example `.aiven/ca.pem` locally). When set, connections use `rejectUnauthorized: true`. |
| **`ENABLE_PROGRAM_FIXTURES`** | Development & tests | Enables fixture program data when no live database is configured. Defaults to enabled in tests unless set to `false`. |
| **`TEST_WITH_LIVE_DB`** | Tests | When `true`, allows tests to use a live database instead of fixtures. |
| **`HONEYBADGER_API_KEY`** | Server | Honeybadger server error monitoring key. |
| **`NEXT_PUBLIC_HONEYBADGER_API_KEY`** | Client | Honeybadger browser error monitoring key. |

## Database runtime notes

- **Runtime pool:** one global `pg.Pool` per serverless instance (`max: 1`, `idleTimeoutMillis: 5000`, `connectionTimeoutMillis: 5000`) registered with `@vercel/functions` `attachDatabasePool()`.
- **Administrative connections:** migrations and program sync/bootstrap use direct `pg.Client` instances that connect, run, and end without registering with `attachDatabasePool()`.
- **Fixture fallback:** importing server data modules does not require `POSTGRES_URL`. Tests and local development can continue using fixture programs when configured.
- **Deployment:** Aiven PostgreSQL is the target provider for upcoming Preview/Production cutover. Legacy Neon credentials may remain in Vercel for rollback until explicitly retired.
