import { GroupCategory } from "./program";

export type RuleType =
  | "all_of"
  | "choose_n"
  | "choose_credits"
  | "elective"
  | "free_elective"
  | "concentration"
  | "informational"
  | "unparsed";

export interface ParserWarning {
  code: string;
  message: string;
  path?: string;
  rawExcerpt?: string;
}

export interface CourseRequirementDomain {
  sourcePid?: string;
  courseCode: string;
  title: string;
  credits: number | null;
  optional?: boolean;
  sourcePath: string;
  warnings?: ParserWarning[];
}

export interface RequirementGroupDomain {
  stableSourcePath: string;
  title: string;
  category: GroupCategory;
  ruleType: RuleType;
  minimumSelections?: number;
  maximumSelections?: number;
  minimumCredits?: number;
  children: RequirementGroupDomain[];
  courseRequirements: CourseRequirementDomain[];
  textRequirements: string[];
  warnings?: ParserWarning[];
}

export interface CatalogProgram {
  sourcePid: string;
  slug: string;
  title: string;
  credential: string;
  catalogId: string;
  catalogYearLabel: string;
  totalCredits: number | null;
  sourceUrl: string;
  descriptionSummary: string;
  requirementGroups: RequirementGroupDomain[];
  sourceHash: string;
  warnings: ParserWarning[];
}

export interface PrerequisiteEdgeDomain {
  id: string;
  source: string; // course code or course PID
  target: string; // course code or course PID
  type: "prerequisite" | "corequisite" | "recommended";
  label?: string;
}
