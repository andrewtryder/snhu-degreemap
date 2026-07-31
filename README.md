# SNHU Degree Map

Unofficial interactive SNHU degree maps with catalog-backed program requirements, prerequisite graphs, and course relationships.

The SNHU Degree Map application lets students browse SNHU degree programs, inspect requirement groups, and visualize prerequisite and corequisite relationships as an interactive graph.

## Live Site

**[https://snhu-degreemap.vercel.app](https://snhu-degreemap.vercel.app)**

## Why This Exists

I built this site as a proud SNHU graduate who wanted a clearer way to understand:

- What courses make up a degree
- How general education, core, major, concentration, and elective requirements fit together
- Which courses may need to be completed before others
- How prerequisite chains can affect degree planning

This site is a planning and visualization aid, not an official degree audit or prescribed plan of study.

## Disclaimer

**This site is unofficial and is intended for informational purposes only.**

- This project is not affiliated with, endorsed by, or operated by Southern New Hampshire University.
- Catalog requirements, prerequisite rules, concentrations, course availability, and academic policies can change.
- Parsed catalog data may be incomplete, delayed, or incorrectly interpreted.
- A displayed graph is not an official recommended course sequence.
- Students must verify requirements against the official SNHU Academic Catalog and with an academic advisor before making academic or financial decisions.

## Related Projects

- **[SNHU Course Prerequisites Tool](https://github.com/andrewtryder/snhu-courses)** ([Live Site](https://snhu-courses.vercel.app))
- **[SNHU Transfer Equivalency List](https://github.com/andrewtryder/snhu-transfers)** ([Live Site](https://snhu-transfers.vercel.app))

**How they differ:**

- **Degree Map** visualizes requirements within a specific degree program.
- **Courses** explores course-level prerequisite relationships independently of a degree.
- **Transfers** explores unofficial transfer equivalencies from outside providers.

## Features

- Browse synchronized SNHU degree programs
- Search by program title or credential
- View course requirements grouped by academic category
- Visualize prerequisite and corequisite relationships
- Use interactive zooming, panning, searching, filtering, and highlighting
- Inspect course details
- Switch to an accessible HTML requirements-list view
- Follow links to official catalog records
- View catalog synchronization and data-status information
- SEO metadata, `robots.txt`, and `sitemap.xml` support
- Vercel Analytics and Honeybadger monitoring

## Tech Stack

- [Next.js](https://nextjs.org/) App Router
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Flow / XYFlow](https://reactflow.dev/) for interactive graph rendering
- [Dagre](https://github.com/dagrejs/dagre) for directed graph layout
- [PostgreSQL](https://www.postgresql.org/) for storing parsed catalog data
- [Neon](https://neon.tech/) for serverless Postgres hosting
- [Vercel](https://vercel.com/) for application hosting
- [CircleCI](https://circleci.com/) for external catalog synchronization
- [Vitest](https://vitest.dev/) for unit testing
- [Testing Library](https://testing-library.com/) for DOM testing
- [Vercel Analytics](https://vercel.com/docs/analytics) for analytics
- [Honeybadger](https://www.honeybadger.io/) for error monitoring
- [Lucide React](https://lucide.dev/) for icons

## Architecture Overview

This project is a Next.js application backed by a PostgreSQL catalog database and hosted on Vercel.

- Next.js serves the program directory and individual program pages.
- Catalog data is stored in PostgreSQL rather than fetched during visitor requests.
- React Flow renders the interactive degree graphs.
- Dagre calculates node positions based on available prerequisite edges.
- Server-side data loaders reconstruct requirement groups, course nodes, and edges.
- CircleCI runs external synchronization to avoid using Vercel cron or function execution for long-running imports.
- Vercel hosts the web application and deploys pushes through native Git integration.

```text
src/
  app/
    about/
    api/
    data-status/
    methodology/
    programs/
    layout.tsx
    page.tsx

  components/
    graph/
    ui/
    AppFooter.tsx
    AppHeader.tsx
    ProgramBrowserDialog.tsx

  lib/
    program-sync/
    database.ts
    graphLayout.ts
    graphTransformer.ts
    serverData.ts

  types/
    program.ts

scripts/
  migrate.ts
  probe-kuali-programs.ts
  program-bootstrap.ts
  program-sync.ts

.circleci/
  config.yml
```

### How It Works

1. CircleCI or an authorized operator retrieves the program list from SNHU’s published Kuali catalog endpoints.
2. Program details and referenced course details are fetched outside visitor requests.
3. Requirements, courses, prerequisite relationships, and warnings are parsed.
4. Data is written to staging tables.
5. Staging data is validated for completeness, snapshot accounting, unexpected shrinkage, and synchronization failures.
6. Valid data is atomically promoted to live tables.
7. The Next.js program-data cache tag is invalidated.
8. Degree pages read the promoted PostgreSQL data.

_Note: Kuali is an unsupported external dependency whose payload structure can change. The catalog parsing process is not flawless._

### Graph Interpretation

- A course is represented by a **node**.
- Solid arrows represent **prerequisites**.
- Dashed arrows represent **corequisites**.
- Colors represent **requirement categories** (e.g., General Education, Major Core).
- Courses with no displayed incoming edge may be starting courses, but missing or unparsed catalog data can also result in no displayed edge.
- The graph shows known catalog relationships, **not** a guaranteed semester-by-semester schedule.
- Requirement groups and prerequisite relationships are different concepts: being listed earlier in a catalog does not automatically mean one course is a prerequisite for another.

### Data Accuracy and Known Limitations

- Catalog structures can vary between programs.
- Prerequisite rules can include prose, alternatives, test scores, permissions, grades, or non-course requirements that may not map cleanly to graph edges.
- Some prerequisite courses may fall outside the selected degree program.
- Some programs may therefore appear flatter than expected.
- Concentrations and choice groups should not be interpreted as requiring every displayed option.
- Credit values may be unavailable when the source does not provide a reliable number.
- The official SNHU catalog and an academic advisor remain authoritative.

## Local Development

Install dependencies:

```bash
git clone https://github.com/andrewtryder/snhu-degreemap.git
cd snhu-degreemap
npm ci
```

Create a `.env` file (see `.env.example`):

```bash
cp .env.example .env
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

_Note: Database-backed program pages require a valid PostgreSQL connection and relevant Kuali configuration. Never commit `.env` files or API keys._

## Environment Variables

| Variable                          | Required | Purpose                                                                                            |
| --------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `POSTGRES_URL`                    | Yes      | Neon/PostgreSQL connection string.                                                                 |
| `POSTGRES_URL_NON_POOLING`        | Optional | Direct Neon connection string (for migrations).                                                    |
| `REVALIDATE_SECRET`               | Optional | Secret token for cache revalidation endpoints.                                                     |
| `SITE_URL`                        | Optional | Base URL for backend scripts and external sync webhook.                                            |
| `NEXT_PUBLIC_SITE_URL`            | Optional | Application canonical URL for the browser.                                                         |
| `KUALI_BASE_URL`                  | Yes      | Base URL for Kuali catalog endpoints.                                                              |
| `KUALI_CATALOG_ID`                | Yes      | Catalog year identifier used during synchronization.                                               |
| `KUALI_CATALOG_YEAR_LABEL`        | Yes      | Display label for the catalog year (e.g., "2024-2025").                                            |
| `KUALI_REQUEST_TIMEOUT_MS`        | Optional | Timeout for catalog network requests.                                                              |
| `KUALI_USER_AGENT`                | Optional | User-Agent string for catalog network requests.                                                    |
| `NEXT_PUBLIC_COURSES_URL`         | Optional | External link to the SNHU Courses tool.                                                            |
| `NEXT_PUBLIC_TRANSFERS_URL`       | Optional | External link to the SNHU Transfers tool.                                                          |
| `HONEYBADGER_API_KEY`             | Optional | Server-side API key for error reporting. Never expose this key in the browser with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_HONEYBADGER_API_KEY` | Optional | Frontend API key for browser error reporting.                                                      |

## Available Scripts

- `npm run dev` - Start the Next.js development server
- `npm run build` - Create a production build
- `npm run start` - Run the production server
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest tests
- `npm run test:watch` - Run Vitest tests in watch mode
- `npm run db:migrate` - Run database migrations to create or update catalog tables
- `npm run program:bootstrap` - Run an initial catalog import directly to live tables
- `npm run program:sync` - Run the standard catalog synchronization, staging, validation, and promotion process

_Warning: Mutation-capable scripts like `program:bootstrap` and `program:sync` can modify catalog-owned database tables. Operators should verify `POSTGRES_URL` before running these commands._

## Database Setup

Initialize the database schema:

```bash
npm run db:migrate
```

Migrations connect using the `POSTGRES_URL` (or `POSTGRES_URL_NON_POOLING` if applicable) variable. Migrations are idempotent and can be safely re-run without duplicating columns or tables. Operators should verify the target database before running migrations, as production data should not be modified casually.

## Catalog Synchronization

These commands are for operators and maintainers. Ordinary students do not need to run catalog synchronization to use the application.

- **Initial Bootstrap:** `npm run program:bootstrap` handles the initial approved import of program data.
- **Normal Synchronization:** `npm run program:sync` runs an incremental refresh.

The normal synchronization process acquires a lease, parses data into staging tables, validates the staging snapshot against expected constraints (such as missing programs or large shrinkages), and atomically promotes the valid staging data to live tables. If validation fails, the staging data is not promoted, and the failure is logged.

CircleCI is configured to run scheduled execution of `program:sync` outside the Vercel environment to avoid execution timeouts.

## Deployment

The application is deployed on Vercel:

- Vercel hosts the Next.js application.
- Native Vercel Git integration handles deployments.
- Pushes to the `master` branch create Production Deployments.
- Pushes to other branches create Preview Deployments.
- CircleCI is used exclusively for catalog synchronization, not frontend deployment.
- Production database credentials should not be provided to untrusted preview deployments.
- Cache revalidation occurs after successful catalog promotion by calling the `/api/revalidate` route.

_Note: Vercel cron is not actively configured or used for catalog synchronization._

## Analytics and Error Monitoring

- **Vercel Analytics** is initialized by the application. It must also be enabled in the project settings on the Vercel dashboard. Analytics does not provide catalog data.
- **Honeybadger** provides production error reporting.
  - Server secrets (`HONEYBADGER_API_KEY`) must never use the `NEXT_PUBLIC_` prefix.
  - Browser/client secrets (`NEXT_PUBLIC_HONEYBADGER_API_KEY`) are safe to expose.
  - The application will continue to build and function correctly even if optional browser monitoring is not configured.

## Testing

The project uses Vitest and Testing Library.

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run linting:

```bash
npm run lint
```

Run a production build check:

```bash
npm run build
```

## Contributing

Contributions, bug reports, and focused pull requests are welcome. Because this application relies on an unstable upstream catalog payload structure, please open an issue before submitting substantial parser, schema, synchronization, or catalog-contract changes.

## License

No open-source license has currently been specified for this project. Copyright remains with the repository owner.
