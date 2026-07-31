import { isRawCourseItem } from "@/types/kualiRaw";
import { PrerequisiteEdgeDomain } from "@/types/domainCatalog";

export interface NormalizedCourseDetails {
  pid: string;
  code: string;
  title: string;
  credits: number;
  description: string;
  prerequisiteText?: string;
  prerequisites: string[]; // List of prerequisite course codes
  corequisites: string[]; // List of corequisite course codes
}

export function parseCourseDetails(raw: unknown): NormalizedCourseDetails {
  if (!isRawCourseItem(raw)) {
    throw new Error("Invalid Kuali course detail item");
  }

  const pid = raw.pid || raw.id || "unknown-pid";
  const code = (raw.code || raw.subjectCode?.name || "UNKNOWN").trim().replace("-", " ");
  const title = raw.title || code;
  const description = raw.description || "";

  let credits = 3;
  if (typeof raw.credits === "number") {
    credits = raw.credits;
  } else if (typeof raw.credits === "string") {
    const parsed = parseInt(raw.credits, 10);
    if (!isNaN(parsed)) credits = parsed;
  } else if (typeof raw.credits === "object" && raw.credits !== null && "credits" in raw.credits) {
    const val = (raw.credits as Record<string, unknown>).credits;
    if (typeof val === "number") credits = val;
    else if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) credits = parsed;
    }
  }

  const prereqText = raw.rulesPrerequisites || "";
  const { prerequisites, corequisites } = extractCoursePrerequisitesFromText(prereqText);

  return {
    pid,
    code,
    title,
    credits,
    description,
    prerequisiteText: prereqText,
    prerequisites,
    corequisites,
  };
}

export function extractCoursePrerequisitesFromText(prereqText: string): {
  prerequisites: string[];
  corequisites: string[];
} {
  const prerequisites: string[] = [];
  const corequisites: string[] = [];

  if (!prereqText) return { prerequisites, corequisites };

  // Match course patterns like CS-210, IT 145, MAT-140, ENG 130
  const courseCodeRegex = /\b([A-Z]{2,4})[- ]?(\d{3}[A-Z]?)\b/g;

  const isCoreqContext = prereqText.toLowerCase().includes("corequisite");

  let match: RegExpExecArray | null;
  while ((match = courseCodeRegex.exec(prereqText)) !== null) {
    const subject = match[1];
    const number = match[2];
    const formattedCode = `${subject} ${number}`;

    if (isCoreqContext) {
      if (!corequisites.includes(formattedCode)) {
        corequisites.push(formattedCode);
      }
    } else {
      if (!prerequisites.includes(formattedCode)) {
        prerequisites.push(formattedCode);
      }
    }
  }

  return { prerequisites, corequisites };
}

export function generatePrerequisiteEdges(
  courses: NormalizedCourseDetails[]
): PrerequisiteEdgeDomain[] {
  const edges: PrerequisiteEdgeDomain[] = [];
  const knownCodes = new Set(courses.map((c) => c.code));

  for (const course of courses) {
    for (const prereqCode of course.prerequisites) {
      if (knownCodes.has(prereqCode)) {
        edges.push({
          id: `e-${prereqCode.replace(/\s+/g, "")}-${course.code.replace(/\s+/g, "")}`,
          source: prereqCode,
          target: course.code,
          type: "prerequisite",
        });
      }
    }

    for (const coreqCode of course.corequisites) {
      if (knownCodes.has(coreqCode)) {
        edges.push({
          id: `e-coreq-${coreqCode.replace(/\s+/g, "")}-${course.code.replace(/\s+/g, "")}`,
          source: coreqCode,
          target: course.code,
          type: "corequisite",
        });
      }
    }
  }

  return edges;
}
