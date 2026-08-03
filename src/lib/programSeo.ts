import { DegreeLevel, DegreeProgram } from "@/types/program";

const LEVEL_ALIASES: Record<string, string[]> = {
  BS: ["bs", "bachelor of science", "b.s."],
  BA: ["ba", "bachelor of arts", "b.a."],
  AS: ["as", "associate of science", "a.s."],
  AA: ["aa", "associate of arts", "a.a."],
  MS: ["ms", "master of science", "m.s."],
  MA: ["ma", "master of arts", "m.a."],
  MBA: ["mba", "master of business administration"],
  "RN to BSN": ["rn to bsn", "rn-bsn"],
  "Graduate Certificate": ["graduate certificate"],
  "Undergraduate Certificate": ["undergraduate certificate", "certificate"],
};

function titleMentionsLevel(title: string, degreeLevel: DegreeLevel | string): boolean {
  const normalizedTitle = title.toLowerCase();
  const aliases = LEVEL_ALIASES[degreeLevel] || [String(degreeLevel).toLowerCase()];
  if (aliases.some((alias) => normalizedTitle.includes(alias))) return true;

  // Also treat bare level tokens as already present (e.g. "Computer Science BS").
  const bare = String(degreeLevel).toLowerCase();
  return new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(title);
}

export function buildProgramMapTitle(program: Pick<DegreeProgram, "title" | "degreeLevel">): string {
  const cleanTitle = program.title.trim();
  if (titleMentionsLevel(cleanTitle, program.degreeLevel)) {
    return `${cleanTitle} Degree Map`;
  }
  return `${cleanTitle} ${program.degreeLevel} Degree Map`;
}

export function buildProgramRequirementsTitle(program: Pick<DegreeProgram, "title" | "degreeLevel">): string {
  const cleanTitle = program.title.trim();
  if (titleMentionsLevel(cleanTitle, program.degreeLevel)) {
    return `${cleanTitle} Degree Requirements`;
  }
  return `${cleanTitle} ${program.degreeLevel} Degree Requirements`;
}

export function buildProgramMapDescription(
  program: Pick<DegreeProgram, "title" | "credential" | "catalogYear" | "degreeLevel">,
): string {
  return `Unofficial SNHU ${program.title} (${program.credential}) degree map for catalog year ${program.catalogYear}. Explore published requirement groups and course prerequisite relationships.`;
}

export function buildProgramRequirementsDescription(
  program: Pick<DegreeProgram, "title" | "credential" | "catalogYear">,
): string {
  return `Unofficial SNHU ${program.title} (${program.credential}) courses and requirement groups for catalog year ${program.catalogYear}. Review nested catalog rules and known prerequisite links.`;
}
