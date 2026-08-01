import { DegreeLevel } from "@/types/program";

export type ProgramLevelCategory = "associate" | "bachelor" | "graduate" | "certificate" | "other";

export const PROGRAM_LEVEL_FILTERS = [
  { value: "associate", label: "Associate" },
  { value: "bachelor", label: "Bachelor’s (BA & BS)" },
  { value: "graduate", label: "Graduate (MA/MS)" },
  { value: "certificate", label: "Certificate" },
] as const;

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
  if (normalizedLevel === "aa" || normalizedLevel === "as" || normalizedCredential.includes("associate")) {
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

export function parseProgramLevelFilter(value: string | undefined): ProgramLevelCategory | "all" {
  return value === "associate" || value === "bachelor" || value === "graduate" || value === "certificate"
    ? value
    : "all";
}
