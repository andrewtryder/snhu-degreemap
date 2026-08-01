/**
 * Public SNHU academic catalog program page URL.
 * Do not use Kuali API endpoints for user-facing Official Catalog links.
 */
export function getPublicSnhuCatalogProgramUrl(sourcePid: string): string {
  const trimmed = sourcePid.trim();
  if (!trimmed) {
    throw new Error("sourcePid is required to build a public SNHU catalog URL");
  }
  return `https://www.snhu.edu/admission/academic-catalogs#/programs/${encodeURIComponent(trimmed)}/none`;
}

export function resolvePublicCatalogUrl(sourcePid: string | null | undefined): string | null {
  const trimmed = sourcePid?.trim();
  if (!trimmed) return null;
  return getPublicSnhuCatalogProgramUrl(trimmed);
}
