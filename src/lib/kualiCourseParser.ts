import { isRawCourseItem } from "@/types/kualiRaw";
import { PrerequisiteEdgeDomain } from "@/types/domainCatalog";
import { load } from "cheerio";
import { extractNormalizedCourseCodes, getCourseCodeKey, normalizeCourseCode } from "@/lib/courseCode";

export interface CourseRelationship {
  code: string;
  type: "prerequisite" | "corequisite";
  sourceText: string;
}

export interface NormalizedCourseDetails {
  pid: string;
  code: string;
  title: string;
  credits: number | null;
  description: string;
  prerequisiteText?: string;
  prerequisites: string[]; // List of prerequisite course codes
  corequisites: string[]; // List of corequisite course codes
  relationships?: CourseRelationship[];
  resolutionStatus?: "resolved" | "not_found" | "failed" | "unavailable";
}

export function parseCourseDetails(raw: unknown, fallbackCode?: string): NormalizedCourseDetails {
  if (!isRawCourseItem(raw)) {
    throw new Error("Invalid Kuali course detail item");
  }

  const pid = raw.pid || raw.id || "unknown-pid";
  const sourceCode = raw.code && /\d{3}/.test(raw.code) ? raw.code : fallbackCode || raw.subjectCode?.name || "UNKNOWN";
  const code = normalizeCourseCode(sourceCode);
  const title = raw.title || code;
  const description = raw.description || "";

  let credits: number | null = null;
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
  const { prerequisites, corequisites, relationships } = extractCoursePrerequisitesFromText(prereqText);

  return {
    pid,
    code,
    title,
    credits,
    description,
    prerequisiteText: prereqText,
    prerequisites,
    corequisites,
    relationships,
    resolutionStatus: "resolved",
  };
}

export function extractCoursePrerequisitesFromText(prereqText: string): {
  prerequisites: string[];
  corequisites: string[];
  relationships: CourseRelationship[];
} {
  const relationships: CourseRelationship[] = [];

  if (!prereqText) return { prerequisites: [], corequisites: [], relationships };

  // Kuali has returned both plain text and HTML/list markup. Preserve block
  // boundaries so a corequisite label cannot reclassify a previous clause.
  const text = load(prereqText.replace(/<\/(?:p|div|li|h[1-6]|section)>|<br\s*\/?\s*>/gi, "\n"))("body")
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[\t\r ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

  if (!text) return { prerequisites: [], corequisites: [], relationships };

  const labelPattern = /(?:^|[\n.;])\s*(prerequisites?|corequisites?)\s*:?\s*/gi;
  const labels = Array.from(text.matchAll(labelPattern));
  const clauses = labels.length
    ? labels.map((label, index) => ({
        type: /^corequisite/i.test(label[1]) ? ("corequisite" as const) : ("prerequisite" as const),
        text: text.slice(label.index!, labels[index + 1]?.index).trim(),
      }))
    : [{ type: "prerequisite" as const, text }];

  const seen = new Set<string>();
  for (const clause of clauses) {
    for (const code of extractNormalizedCourseCodes(clause.text)) {
      const key = `${clause.type}:${getCourseCodeKey(code)}`;
      if (!seen.has(key)) {
        seen.add(key);
        relationships.push({ code, type: clause.type, sourceText: clause.text });
      }
    }
  }

  return {
    prerequisites: relationships
      .filter((relationship) => relationship.type === "prerequisite")
      .map((relationship) => relationship.code),
    corequisites: relationships
      .filter((relationship) => relationship.type === "corequisite")
      .map((relationship) => relationship.code),
    relationships,
  };
}

export function generatePrerequisiteEdges(courses: NormalizedCourseDetails[]): PrerequisiteEdgeDomain[] {
  const edges = new Map<string, PrerequisiteEdgeDomain>();

  for (const course of courses) {
    const target = normalizeCourseCode(course.code);
    const relationships = course.relationships || [
      ...course.prerequisites.map((code) => ({
        code,
        type: "prerequisite" as const,
        sourceText: course.prerequisiteText || "",
      })),
      ...course.corequisites.map((code) => ({
        code,
        type: "corequisite" as const,
        sourceText: course.prerequisiteText || "",
      })),
    ];

    for (const relationship of relationships) {
      const source = normalizeCourseCode(relationship.code);
      const key = `${getCourseCodeKey(source)}:${getCourseCodeKey(target)}:${relationship.type}`;
      edges.set(key, {
        id: `e-${relationship.type}-${getCourseCodeKey(source)}-${getCourseCodeKey(target)}`,
        source,
        target,
        type: relationship.type,
        label: relationship.sourceText || undefined,
      });
    }
  }

  return [...edges.values()];
}
