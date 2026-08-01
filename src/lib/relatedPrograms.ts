import { DegreeProgram } from "@/types/program";
import { getProgramLevelCategory } from "@/lib/programLevelCategories";

const STOP_WORDS = new Set([
  "and",
  "the",
  "of",
  "in",
  "for",
  "with",
  "to",
  "a",
  "an",
  "bs",
  "ba",
  "ms",
  "ma",
  "as",
  "aa",
  "mba",
  "degree",
  "program",
  "bachelor",
  "master",
  "science",
  "arts",
  "certificate",
  "graduate",
  "undergraduate",
]);

export function tokenizeProgramTitle(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

export interface RelatedProgramCandidate {
  slug: string;
  title: string;
  credential: string;
  degreeLevel: string;
  sharedCourseCount?: number;
}

export function rankRelatedPrograms(
  current: Pick<DegreeProgram, "slug" | "title" | "credential" | "degreeLevel">,
  candidates: RelatedProgramCandidate[],
  limit = 6,
): RelatedProgramCandidate[] {
  const currentCategory = getProgramLevelCategory(current);
  const currentTokens = tokenizeProgramTitle(current.title);
  const currentCredential = current.credential.toLowerCase();

  return candidates
    .filter((candidate) => candidate.slug !== current.slug)
    .map((candidate) => {
      let score = 0;
      const candidateCategory = getProgramLevelCategory({
        credential: candidate.credential,
        degreeLevel: candidate.degreeLevel,
      });

      if (candidateCategory === currentCategory) score += 40;

      const candidateTokens = tokenizeProgramTitle(candidate.title);
      let sharedTokens = 0;
      for (const token of currentTokens) {
        if (candidateTokens.has(token)) sharedTokens += 1;
      }
      score += sharedTokens * 12;

      if (candidate.credential.toLowerCase() === currentCredential) score += 10;
      else if (
        candidate.credential.toLowerCase().includes("bachelor") &&
        currentCredential.includes("bachelor")
      ) {
        score += 5;
      }

      score += Math.min(candidate.sharedCourseCount || 0, 8) * 6;

      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
