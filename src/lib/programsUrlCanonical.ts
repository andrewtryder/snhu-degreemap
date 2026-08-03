import { getPathForCategory, parseProgramLevelFilter } from "@/lib/programLevelCategories";

/**
 * Resolve a permanent redirect target for `/programs` query variants.
 * Returns null when the URL is already clean (no search params).
 */
export function resolveProgramsRedirect(
  pathname: string,
  searchParams: URLSearchParams | { get(name: string): string | null; toString(): string },
): string | null {
  if (pathname !== "/programs") return null;

  const hasQuery = searchParams.toString().length > 0;
  if (!hasQuery) return null;

  const rawLevel = searchParams.get("level") ?? undefined;
  const level = parseProgramLevelFilter(rawLevel);
  if (level !== "all") {
    return `/programs/${getPathForCategory(level)}`;
  }

  return "/programs";
}
