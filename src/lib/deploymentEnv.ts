/**
 * Whether the current deployment should be indexed by search engines.
 * Only Vercel Production (or a local production build outside Vercel) is indexable.
 */
export function isIndexableDeployment(): boolean {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }
  return process.env.NODE_ENV === "production";
}
