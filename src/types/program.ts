export type DegreeLevel = "BS" | "BA" | "AS" | "AA" | "MS" | "MA" | "MBA" | "RN to BSN" | "Graduate Certificate" | "Undergraduate Certificate" | "Other";

export type GroupCategory = "gened" | "core" | "major" | "elective" | "other";

export interface PrerequisiteRequirement {
  type: "course" | "choice" | "min_credits" | "group";
  courseId?: string;
  options?: string[];
  minCredits?: number;
  description?: string;
}

export interface CourseNodeData {
  id: string;
  code: string; // e.g. "CS 113"
  title: string; // e.g. "Intro to Software Development"
  credits: number | null; // e.g. 3 or null if unknown
  groupCode: string; // e.g. "major"
  groupName: string; // e.g. "Major Requirements"
  groupCategory: GroupCategory;
  description?: string;
  isPlaceholder?: boolean; // for elective placeholders
  placeholderType?: string; // e.g. "Free Elective" or "STEM Elective"
  prerequisites?: string[]; // IDs of prerequisite courses
  corequisites?: string[]; // IDs of corequisite courses
  notes?: string;
}

export interface PrerequisiteEdgeData {
  id: string;
  source: string;
  target: string;
  type?: "prerequisite" | "corequisite" | "recommended";
  label?: string;
}

export interface RequirementItem {
  id: string;
  title: string;
  credits: number | null;
  type: "single" | "choice" | "elective" | "group";
  description?: string;
  courses?: string[];
  subItems?: RequirementItem[];
  unparsedRawText?: string;
}

export interface RequirementGroup {
  id: string;
  title: string;
  category: GroupCategory;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
  totalCredits: number | null;
  description?: string;
  items: RequirementItem[];
}

export interface DegreeProgram {
  slug: string;
  title: string;
  degreeLevel: DegreeLevel;
  credential: string; // e.g. "Bachelor of Science"
  catalogYear: string; // e.g. "2025-2026"
  totalCredits: number | null;
  requiredCourseCount: number;
  electiveCredits: number | null;
  estimatedDuration: string; // e.g. "4 Years (8 Semesters)"
  sourceCatalogUrl: string;
  sourceName: string;
  description: string;
  careerPaths?: string[];
  groups: RequirementGroup[];
  nodes: CourseNodeData[];
  edges: PrerequisiteEdgeData[];
  unparsedRequirements?: string[];
}
