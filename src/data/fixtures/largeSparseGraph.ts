import { CourseNodeData, PrerequisiteEdgeData, RequirementGroup } from "@/types/program";

function course(
  id: string,
  code: string,
  title: string,
  groupCategory: CourseNodeData["groupCategory"],
): CourseNodeData {
  const labels = {
    gened: "General Education",
    core: "Core",
    major: "Major Requirements",
    elective: "Electives",
    other: "Other",
  } as const;
  return {
    id,
    code,
    title,
    credits: 3,
    groupCode: groupCategory,
    groupName: labels[groupCategory],
    groupCategory,
    resolutionStatus: "resolved",
  };
}

/**
 * Synthetic Political Science–sized sparse graph for layout tests.
 * Many isolated courses across categories plus a few small dependency chains.
 * Does not invent academic semester ordering — only layout-relevant edges.
 */
const isolates: CourseNodeData[] = [
  ...Array.from({ length: 12 }, (_, i) =>
    course(`GE${100 + i}`, `GE ${100 + i}`, `General Education Topic ${i + 1}`, "gened"),
  ),
  ...Array.from({ length: 8 }, (_, i) =>
    course(`CORE${200 + i}`, `CORE ${200 + i}`, `Core Skill ${i + 1}`, "core"),
  ),
  ...Array.from({ length: 18 }, (_, i) =>
    course(`POL${300 + i}`, `POL ${300 + i}`, `Political Science Topic ${i + 1}`, "major"),
  ),
  ...Array.from({ length: 6 }, (_, i) =>
    course(`EL${400 + i}`, `EL ${400 + i}`, `Elective Option ${i + 1}`, "elective"),
  ),
];

const chainA: CourseNodeData[] = [
  course("POL101", "POL 101", "American Politics", "major"),
  course("POL201", "POL 201", "Research Methods", "major"),
  course("POL301", "POL 301", "Advanced Seminar", "major"),
];

const chainB: CourseNodeData[] = [
  course("HIS100", "HIS 100", "World History", "gened"),
  course("HIS210", "HIS 210", "Historical Writing", "gened"),
];

const chainC: CourseNodeData[] = [
  course("MAT130", "MAT 130", "Applied Math", "core"),
  course("MAT230", "MAT 230", "Applied Statistics", "core"),
];

/** Corequisite pair (same component, not a long prereq chain). */
const coreqPair: CourseNodeData[] = [
  course("POL250", "POL 250", "Comparative Politics", "major"),
  course("POL251", "POL 251", "Comparative Lab", "major"),
];

export const largeSparseGraphNodes: CourseNodeData[] = [
  ...isolates,
  ...chainA,
  ...chainB,
  ...chainC,
  ...coreqPair,
];

export const largeSparseGraphEdges: PrerequisiteEdgeData[] = [
  { id: "e_pol101_201", source: "POL101", target: "POL201", type: "prerequisite" },
  { id: "e_pol201_301", source: "POL201", target: "POL301", type: "prerequisite" },
  { id: "e_his100_210", source: "HIS100", target: "HIS210", type: "prerequisite" },
  { id: "e_mat130_230", source: "MAT130", target: "MAT230", type: "prerequisite" },
  { id: "e_pol250_251", source: "POL250", target: "POL251", type: "corequisite" },
];

export const largeSparseRequirementGroups: RequirementGroup[] = [
  {
    id: "major-core",
    title: "Major Core",
    category: "major",
    colorTheme: {
      bg: "#f3e8ff",
      border: "#7e22ce",
      text: "#581c87",
      badgeBg: "#7e22ce",
      badgeText: "#ffffff",
    },
    totalCredits: 9,
    ruleType: "all_of",
    ruleMetadata: {
      explicitCourseCodes: ["POL 101", "POL 201", "POL 301"],
      policyNotes: ["Complete all listed major core courses."],
    },
    items: [
      {
        id: "major-core-item",
        title: "Major Core Courses",
        credits: 9,
        type: "group",
        courses: ["POL 101", "POL 201", "POL 301"],
      },
    ],
  },
  {
    id: "gened-history",
    title: "History Electives",
    category: "gened",
    colorTheme: {
      bg: "#dbe1ff",
      border: "#003087",
      text: "#001d59",
      badgeBg: "#003087",
      badgeText: "#ffffff",
    },
    totalCredits: 6,
    ruleType: "choose_credits",
    minimumCredits: 6,
    ruleMetadata: {
      explicitCourseCodes: ["HIS 100", "HIS 210"],
    },
    items: [
      {
        id: "history-choice",
        title: "History options",
        credits: 6,
        type: "choice",
        courses: ["HIS 100", "HIS 210"],
      },
    ],
  },
];
