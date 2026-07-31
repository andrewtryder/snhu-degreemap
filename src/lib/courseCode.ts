/** Convert catalog course-code variants into the display form used everywhere. */
export function normalizeCourseCode(value: string | null | undefined): string {
  const source = value?.replace(/\u00a0/g, " ").trim() || "";
  if (!source) return "";

  const match = source.match(/\b([a-z]{2,4})[\s-]*(\d{3}[a-z]?)\b/i);
  if (!match) return source.replace(/\s+/g, " ").toUpperCase();

  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

/** Stable identity for graph nodes and comparisons, e.g. `ACC 201` -> `ACC201`. */
export function getCourseCodeKey(value: string | null | undefined): string {
  return normalizeCourseCode(value).replace(/[^A-Z0-9]/g, "");
}

export const getCourseNodeId = getCourseCodeKey;

export function extractNormalizedCourseCodes(value: string): string[] {
  const codes = new Set<string>();
  const pattern = /\b([a-z]{2,4})[\s\u00a0-]*(\d{3}[a-z]?)\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const code = normalizeCourseCode(match[0]);
    if (code) codes.add(code);
  }

  return [...codes];
}
