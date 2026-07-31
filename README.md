# SNHU Degree Map

## Vercel deployments

- Pushes to `master` create Production Deployments.
- Pushes to other branches create Preview Deployments.
- Deployment is handled by Vercel's native GitHub integration.
- CircleCI does not deploy the frontend.
- CircleCI only performs scheduled data synchronization and calls the cache-revalidation endpoint following successful promotion.
- Web Analytics requires the dashboard feature to be enabled and the `@vercel/analytics` package to remain installed.
- Analytics begins collecting production traffic after the deployment containing `<Analytics />` is live.
