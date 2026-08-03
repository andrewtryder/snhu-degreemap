import { getProgramLevelCategory } from "@/lib/programLevelCategories";

/** Editorial bachelor homepage cards (verified prod slugs; omit missing rather than invent). */
export const POPULAR_BACHELOR_PROGRAM_SLUGS = [
  "computer-science-bs",
  "cybersecurity-bs",
  "business-administration-bs",
  "psychology-ba",
  "accounting-bs",
  "criminal-justice-bs",
  "information-technologies-bs",
  "data-analytics-bs",
  "finance-bs",
  "marketing-bs",
  "healthcare-administration-bs",
  "nursing-bsn-bachelor-of-science",
  "communication-ba",
  "political-science-ba",
] as const;

export type PopularBachelorProgramCandidate = {
  slug: string;
  title: string;
  credential: string;
  degreeLevel: string;
  catalogYear: string;
  totalCredits: number | null;
  description: string;
};

/**
 * Resolve curated bachelor programs from an already-loaded program list.
 * Skips missing or non-bachelor entries; warns once per missing configured slug.
 */
export function resolvePopularBachelorPrograms<T extends PopularBachelorProgramCandidate>(
  programs: T[],
  options?: { warn?: (message: string) => void },
): T[] {
  const warn = options?.warn ?? ((message: string) => console.warn(message));
  const bySlug = new Map(programs.map((program) => [program.slug, program]));
  const resolved: T[] = [];

  for (const slug of POPULAR_BACHELOR_PROGRAM_SLUGS) {
    const program = bySlug.get(slug);
    if (!program) {
      warn(`Popular bachelor program slug missing from catalog: ${slug}`);
      continue;
    }
    if (getProgramLevelCategory(program) !== "bachelor") {
      warn(`Popular bachelor program slug is not bachelor-level: ${slug}`);
      continue;
    }
    resolved.push(program);
    if (resolved.length >= 15) break;
  }

  return resolved;
}
