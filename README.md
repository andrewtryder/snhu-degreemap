# SNHU Degree Map

SNHU Degree Map is an unofficial web application for exploring degree requirements, course relationships, and prerequisite structures for Southern New Hampshire University programs.

> **Disclaimer:** SNHU Degree Map is an independent, unofficial project. It is not affiliated with, endorsed by, or operated by Southern New Hampshire University. Students should confirm all academic requirements with the official catalog and an academic advisor.

## Live Site
[https://snhu-degreemap.vercel.app](https://snhu-degreemap.vercel.app)

## Overview

SNHU Degree Map helps users:
- Browse synchronized degree programs.
- View requirement groups.
- Explore prerequisite and corequisite relationships.
- Search programs and course references.
- Use an accessible requirements-list alternative to the graph.
- Follow links to official source records when available.

## Features

- Database-backed program directory
- Search
- Interactive React Flow graph
- Dagre layout
- Requirement-group coloring
- Course detail dialogs
- Prerequisite and corequisite edges
- Accessible HTML requirements view
- Dynamic metadata
- Sitemap
- Data-status page
- CircleCI synchronization
- Vercel Analytics
- Tag-based cache invalidation

## How degree maps work
The application visualizes academic programs as directed graphs. Requirement groups (such as General Education or Major Core) are color-coded, while courses are represented as nodes. Edges depict prerequisite and corequisite relationships, helping students understand sequencing visually. For users who prefer a standard document outline, an accessible HTML requirements view is provided.

## Data source and synchronization
- Program and course data is retrieved from SNHU’s published Kuali catalog endpoints.
- The catalog interface is treated as an unstable external dependency.
- Synchronization runs outside Vercel through CircleCI.
- Data is staged and validated before promotion.
- Successful promotion invalidates the Next.js program-data cache tag.
- Production pages do not scrape Kuali during visitor requests.
- Data may be incomplete or delayed.
- Users must verify requirements with SNHU.

## Architecture

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- React Flow
- Dagre
- PostgreSQL
- Neon
- Vercel
- CircleCI
- Vitest

## Local development

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
```

## Environment variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `POSTGRES_URL` | Neon/PostgreSQL connection string | Yes |
| `KUALI_BASE_URL` | Base URL for Kuali catalog endpoints | Yes |
| `KUALI_CATALOG_ID` | Catalog year identifier | Yes |
| `KUALI_CATALOG_YEAR_LABEL` | Display label for the catalog year | Yes |
| `KUALI_REQUEST_TIMEOUT_MS` | Timeout for catalog requests | Optional |
| `KUALI_USER_AGENT` | User-Agent string for requests | Optional |
| `NEXT_PUBLIC_SITE_URL` | Application canonical URL | Optional |
| `SITE_URL` | Base URL for backend scripts | Optional |
| `REVALIDATE_SECRET` | Secret token for cache revalidation | Optional |
| `ENABLE_PROGRAM_FIXTURES` | Enable mock programs in non-production environments | Optional |
| `HONEYBADGER_API_KEY` | Backend error reporting key | Optional |
| `NEXT_PUBLIC_HONEYBADGER_API_KEY` | Frontend error reporting key | Optional |

## Database setup

```bash
npm run db:migrate
```
Migrations are idempotent and can be re-run safely.

## Catalog synchronization

```bash
npm run program:bootstrap
npm run program:sync
```
- `bootstrap` is for the initial approved import.
- `sync` refreshes staging and promotes validated data.
- Synchronization can modify catalog-owned database tables.
- Operators should verify `POSTGRES_URL` before running either command.

## Deployment

- Vercel hosts the Next.js frontend.
- Vercel’s native Git integration handles deployments.
- Pushes to master create Production Deployments.
- Other branches create Preview Deployments.
- CircleCI does not deploy the frontend.
- CircleCI runs scheduled catalog synchronization.
- A successful catalog promotion calls the authenticated revalidation endpoint.
- `vercel.json` does not contain a cron.

## Vercel Web Analytics
- Web Analytics must be enabled in the Vercel project.
- The application renders the official `@vercel/analytics` component once in the root layout.
- Analytics begins collecting traffic after the deployment containing the integration is live.
- Analytics must not be described as a source of catalog or academic data.

## Testing
Tests are managed via Vitest and Testing Library. Run all tests locally with `npm test`.

## Data accuracy and limitations
This tool is a supplemental aid. Academic rules may change and catalog parsing may have flaws. Guaranteed accuracy is not provided, and graduation sequences are not officially recommended through this platform.

## Related projects
- [andrewtryder/snhu-courses](https://github.com/andrewtryder/snhu-courses) - course and prerequisite exploration
- [andrewtryder/snhu-transfers](https://github.com/andrewtryder/snhu-transfers) - transfer-equivalency exploration

## Contributing
Contributions and bug reports are welcome. Since this relies on a specific external data structure, please open an issue before submitting significant catalog-parsing changes.

## License
No open-source license has been specified for this project.
