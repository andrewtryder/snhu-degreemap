import { isIndexableDeployment } from "@/lib/deploymentEnv";
import { getSiteUrl } from "@/lib/siteUrl";

export type HostRedirectInput = {
  host: string | null | undefined;
  proto: string | null | undefined;
  pathname: string;
  search: string;
  /** Override for tests; defaults to isIndexableDeployment(). */
  isProduction?: boolean;
  /** Override for tests; defaults to getSiteUrl(). */
  preferredOrigin?: string;
};

function stripPort(host: string): string {
  // IPv6 literals are rare here; strip a trailing :port for hostname hosts.
  if (host.startsWith("[")) return host;
  const colon = host.lastIndexOf(":");
  if (colon > -1 && /^\d+$/.test(host.slice(colon + 1))) {
    return host.slice(0, colon);
  }
  return host;
}

/**
 * When in production, redirect non-preferred hosts and non-HTTPS schemes
 * to the configured preferred origin (getSiteUrl). Preview deployments skip.
 * Returns a full absolute URL, or null when no redirect is needed.
 */
export function resolveCanonicalHostRedirect(input: HostRedirectInput): string | null {
  const isProduction = input.isProduction ?? isIndexableDeployment();
  if (!isProduction) return null;

  const preferredOrigin = (input.preferredOrigin ?? getSiteUrl()).replace(/\/+$/, "");
  let preferred: URL;
  try {
    preferred = new URL(preferredOrigin);
  } catch {
    return null;
  }

  const rawHost = (input.host ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (!rawHost) return null;

  const requestHost = stripPort(rawHost);
  const preferredHost = preferred.hostname.toLowerCase();
  const requestProto = (input.proto ?? "https").split(",")[0]?.trim().toLowerCase() || "https";
  const preferredProto = preferred.protocol.replace(":", "") || "https";

  if (requestHost === preferredHost && requestProto === preferredProto) {
    return null;
  }

  const path = input.pathname || "/";
  const search = input.search && !input.search.startsWith("?") ? `?${input.search}` : input.search;
  return `${preferred.origin}${path}${search}`;
}
