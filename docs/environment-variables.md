# Environment Variable Reference for SNHU Degree Map

## Required Environment Variables

| Variable Name | Context / Location | Description |
| :--- | :--- | :--- |
| **`POSTGRES_URL`** | Vercel & CircleCI | PostgreSQL connection string. CircleCI synchronization jobs use the **direct (non-pooled)** connection string to support long-running transactions. Vercel runtime uses the **pooled** connection string. |
| **`KUALI_BASE_URL`** | All Environments | Base URL for SNHU Kuali API (`https://snhu.kuali.co`). |
| **`KUALI_CATALOG_ID`** | All Environments | Active SNHU catalog UUID (`6349a3f9164d00001c6c80da`). |
| **`KUALI_REQUEST_TIMEOUT_MS`** | Sync CLI | Request timeout in milliseconds (default: `10000`). |
| **`KUALI_USER_AGENT`** | Sync CLI | Descriptive HTTP User-Agent string. |
| **`REVALIDATE_SECRET`** | Vercel & CircleCI | Secret token protecting `POST /api/revalidate`. Must be set identically in Vercel and the CircleCI context. |
| **`SITE_URL`** | CircleCI | Production application base URL (e.g. `https://snhu-degreemap.vercel.app`) used by CircleCI for revalidation triggers. |
| **`NEXT_PUBLIC_SITE_URL`** | Client & Server | Production public site URL for canonical metadata headers. |

## Optional Environment Variables

| Variable Name | Context / Location | Description |
| :--- | :--- | :--- |
| **`HONEYBADGER_API_KEY`** | Server | Honeybadger server error monitoring key. |
| **`NEXT_PUBLIC_HONEYBADGER_API_KEY`** | Client | Honeybadger browser error monitoring key. |
