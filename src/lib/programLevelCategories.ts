import { DegreeLevel, DegreeProgram } from "@/types/program";

export type ProgramLevelCategory =
  | "associate"
  | "bachelor"
  | "graduate"
  | "certificate"
  | "other";

export type ProgramLevelPathCategory = Exclude<ProgramLevelCategory, "other">;

export const PROGRAM_LEVEL_FILTERS = [
  { value: "associate", label: "Associate" },
  { value: "bachelor", label: "Bachelor’s (BA & BS)" },
  { value: "graduate", label: "Graduate (MA/MS)" },
  { value: "certificate", label: "Certificate" },
] as const;

export const PROGRAM_LEVEL_PATHS = [
  {
    path: "associate",
    category: "associate",
    h1: "Associate Degree Programs",
    description:
      "Browse unofficial SNHU associate degree requirements, major course maps, and prerequisite structures.",
    intro:
      "Associate programs typically introduce foundational coursework for a field of study. These unofficial maps show required courses and prerequisites for active catalog years.",
  },
  {
    path: "bachelors",
    category: "bachelor",
    h1: "Bachelor’s Degree Programs",
    description:
      "Browse unofficial SNHU bachelor’s degree requirements, BA and BS course maps, and prerequisite structures.",
    intro:
      "Bachelor’s programs (BA and BS) organize general education, major, and elective requirements into a full undergraduate path. These unofficial maps show course structure and prerequisites for active catalog years.",
  },
  {
    path: "graduate",
    category: "graduate",
    h1: "Graduate Degree Programs",
    description:
      "Browse unofficial SNHU graduate degree requirements, master’s course maps, and prerequisite structures.",
    intro:
      "Graduate programs focus on advanced coursework for master’s credentials. These unofficial maps show required courses and prerequisites for active catalog years.",
  },
  {
    path: "certificates",
    category: "certificate",
    h1: "Certificate Programs",
    description:
      "Browse unofficial SNHU certificate program requirements, course maps, and prerequisite structures.",
    intro:
      "Certificate programs concentrate on a focused set of courses. These unofficial maps show required coursework and prerequisites for active catalog years.",
  },
] as const;

export type ProgramLevelPath = (typeof PROGRAM_LEVEL_PATHS)[number]["path"];

type ProgramLevelInput = {
  credential: string;
  degreeLevel?: DegreeLevel | string;
};

export function getProgramLevelCategory({ credential, degreeLevel }: ProgramLevelInput): ProgramLevelCategory {
  const normalizedCredential = credential.toLowerCase();
  const normalizedLevel = (degreeLevel || "").toLowerCase();

  if (normalizedCredential.includes("certificate") || normalizedLevel.includes("certificate")) {
    return "certificate";
  }
  if (
    normalizedLevel === "aa" ||
    normalizedLevel === "as" ||
    normalizedCredential.includes("associate")
  ) {
    return "associate";
  }
  if (
    normalizedLevel === "ba" ||
    normalizedLevel === "bs" ||
    normalizedLevel === "rn to bsn" ||
    normalizedCredential.includes("bachelor")
  ) {
    return "bachelor";
  }
  if (
    normalizedLevel === "ma" ||
    normalizedLevel === "ms" ||
    normalizedLevel === "mba" ||
    normalizedCredential.includes("master") ||
    normalizedCredential.includes("graduate")
  ) {
    return "graduate";
  }

  return "other";
}

export function parseProgramLevelFilter(value: string | undefined): ProgramLevelPathCategory | "all" {
  return value === "associate" || value === "bachelor" || value === "graduate" || value === "certificate"
    ? value
    : "all";
}

export function getCategoryByPath(path: string): (typeof PROGRAM_LEVEL_PATHS)[number] | undefined {
  return PROGRAM_LEVEL_PATHS.find((entry) => entry.path === path);
}

export function getPathForCategory(category: ProgramLevelPathCategory): ProgramLevelPath {
  const entry = PROGRAM_LEVEL_PATHS.find((item) => item.category === category);
  if (!entry) {
    throw new Error(`Unknown program level category: ${category}`);
  }
  return entry.path;
}

export function getProgramLevelHref(level: ProgramLevelCategory | "all"): string {
  if (level === "all" || level === "other") return "/programs";
  return `/programs/${getPathForCategory(level)}`;
}

export function filterProgramsByLevel(
  programs: DegreeProgram[],
  level: ProgramLevelCategory | "all"
): DegreeProgram[] {
  if (level === "all") return programs;
  return programs.filter((program) => getProgramLevelCategory(program) === level);
}

export function getRelatedCategoryPaths(currentPath: ProgramLevelPath) {
  return PROGRAM_LEVEL_PATHS.filter((entry) => entry.path !== currentPath);
}
