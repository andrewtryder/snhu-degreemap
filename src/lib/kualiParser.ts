import crypto from "node:crypto";
import * as cheerio from "cheerio";
import { GroupCategory } from "@/types/program";
import {
  isRawProgramListItem,
  isRawProgramDetail,
} from "@/types/kualiRaw";
import {
  CatalogProgram,
  RequirementGroupDomain,
  CourseRequirementDomain,
  RuleType,
  ParserWarning,
} from "@/types/domainCatalog";

export function hashSourcePayload(raw: unknown): string {
  const jsonStr = JSON.stringify(raw ?? "");
  return crypto.createHash("sha256").update(jsonStr).digest("hex");
}

export function createProgramSlug(title: string, credential?: string): string {
  const slugFromTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (/\b(bs|ba|as|ms|rn-to-bsn)\b/.test(slugFromTitle)) {
    return slugFromTitle;
  }

  if (credential) {
    const credSlug = credential
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    return `${slugFromTitle}-${credSlug}`;
  }

  return slugFromTitle;
}

export function normalizeCredential(title: string, rawTypeName?: string): string {
  const t = title.toUpperCase();
  if (t.includes("RN TO BSN") || t.includes("RN-TO-BSN")) {
    return "Bachelor of Science in Nursing (RN to BSN)";
  }
  if (t.includes("(BS)") || t.includes("BACHELOR OF SCIENCE") || rawTypeName?.includes("Bachelor")) {
    return "Bachelor of Science";
  }
  if (t.includes("(BA)") || t.includes("BACHELOR OF ARTS")) {
    return "Bachelor of Arts";
  }
  if (t.includes("(AS)") || t.includes("ASSOCIATE OF SCIENCE") || rawTypeName?.includes("Associate")) {
    return "Associate of Science";
  }
  if (t.includes("(MS)") || t.includes("MASTER OF SCIENCE") || rawTypeName?.includes("Master")) {
    return "Master of Science";
  }
  return rawTypeName || "Bachelor's Degree";
}

function mapTitleToGroupCategory(title: string): GroupCategory {
  const lower = title.toLowerCase();
  if (lower.includes("gen") || lower.includes("general education")) return "gened";
  if (lower.includes("core") || lower.includes("foundation")) return "core";
  if (lower.includes("major")) return "major";
  if (lower.includes("elective") || lower.includes("concentration")) return "elective";
  return "other";
}

export function parseProgramListItem(raw: unknown): {
  sourcePid: string;
  title: string;
  code?: string;
  slug: string;
  credential: string;
  category?: string;
  warnings: ParserWarning[];
} {
  const warnings: ParserWarning[] = [];

  if (!isRawProgramListItem(raw)) {
    throw new Error("Invalid Kuali program list item payload");
  }

  const sourcePid = raw.pid || raw.id || "unknown-pid";
  const title = raw.title || "Untitled Program";
  const credential = normalizeCredential(title, raw.programType?.name);
  const slug = createProgramSlug(title, credential);

  if (!raw.pid) {
    warnings.push({
      code: "MISSING_PID",
      message: `Program list item '${title}' missing pid field`,
    });
  }

  return {
    sourcePid,
    title,
    code: raw.code,
    slug,
    credential,
    category: raw.catalogCategory?.name,
    warnings,
  };
}

export function parseRequirementTree(
  rawHtml: string,
  basePath = "root"
): { groups: RequirementGroupDomain[]; totalCredits: number; warnings: ParserWarning[] } {
  const warnings: ParserWarning[] = [];
  const groups: RequirementGroupDomain[] = [];
  let grandTotalCredits = 0;

  if (!rawHtml || typeof rawHtml !== "string") {
    warnings.push({
      code: "EMPTY_RULES",
      message: "No rulesRequirements HTML content provided for program",
    });
    return { groups: [], totalCredits: 0, warnings };
  }

  try {
    const $ = cheerio.load(rawHtml);

    // Extract grand total credits if present
    const grandTotalText = $("h3:contains('Grand Total Credits')").text();
    const grandMatch = grandTotalText.match(/(\d+)/);
    if (grandMatch) {
      grandTotalCredits = parseInt(grandMatch[1], 10);
    }

    $("section").each((index, element) => {
      const sectionPath = `${basePath}.group[${index}]`;
      const groupTitle = $(element).find("h2").text().trim() || `Requirement Group ${index + 1}`;

      // Extract section credits
      const headerSpanText = $(element).find("header").text();
      const creditMatch = headerSpanText.match(/(\d+)\s*Total Credits/i);
      const groupCredits = creditMatch ? parseInt(creditMatch[1], 10) : undefined;

      const category = mapTitleToGroupCategory(groupTitle);
      const courseRequirements: CourseRequirementDomain[] = [];
      const textRequirements: string[] = [];
      const childGroups: RequirementGroupDomain[] = [];
      const seenCourseCodes = new Set<string>();

      let ruleType: RuleType = "all_of";
      let minimumSelections: number | undefined = undefined;
      const minimumCredits: number | undefined = groupCredits;

      const sectionText = $(element).text();
      if (sectionText.includes("Complete 1 of the following") || sectionText.includes("1 of the following:")) {
        ruleType = "choose_n";
        minimumSelections = 1;
      } else if (sectionText.includes("Free Electives")) {
        ruleType = "free_elective";
      } else if (sectionText.includes("Concentration")) {
        ruleType = "concentration";
      } else if (sectionText.includes("credit(s) from")) {
        ruleType = "choose_credits";
      }

      // Parse course links: <a href="#/courses/view/{pid}">CODE</a> - Course Title (Credits)
      $(element)
        .find("a[href*='/courses/view/']")
        .each((cIndex, anchorElem) => {
          const anchor = $(anchorElem);
          const courseCode = anchor.text().trim();
          const href = anchor.attr("href") || "";
          const pidMatch = href.match(/\/courses\/view\/([a-zA-Z0-9_]+)/);
          const sourcePid = pidMatch ? pidMatch[1] : undefined;

          if (courseCode && !seenCourseCodes.has(courseCode)) {
            seenCourseCodes.add(courseCode);

            const parentLiText = anchor.closest("li").text().trim();
            const parts = parentLiText.split("-");
            let cTitle = parts.length > 1 ? parts.slice(1).join("-").trim() : parentLiText;
            let cCredits: number | null = null;

            const crMatch = cTitle.match(/\((\d+)(?:\s*-\s*\d+)?\)/);
            if (crMatch) {
              cCredits = parseInt(crMatch[1], 10);
              cTitle = cTitle.replace(/\(\d+(?:\s*-\s*\d+)?\)/, "").trim();
            }

            courseRequirements.push({
              sourcePid,
              courseCode,
              title: cTitle || courseCode,
              credits: cCredits,
              sourcePath: `${sectionPath}.course[${cIndex}]`,
            });
          }
        });

      // Extract text rules
      $(element)
        .find("li")
        .each((_, liElem) => {
          const itemText = $(liElem).text().trim();
          if (
            itemText &&
            !itemText.startsWith("Complete") &&
            !itemText.includes("Total Credits") &&
            $(liElem).find("a[href*='/courses/view/']").length === 0 &&
            !textRequirements.includes(itemText)
          ) {
            textRequirements.push(itemText);
          }
        });

      groups.push({
        stableSourcePath: sectionPath,
        title: groupTitle,
        category,
        ruleType,
        minimumSelections,
        minimumCredits,
        children: childGroups,
        courseRequirements,
        textRequirements,
        warnings: [],
      });
    });
  } catch (err: unknown) {
    warnings.push({
      code: "PARSER_HTML_ERROR",
      message: `Failed to parse rulesRequirements HTML: ${(err as Error).message}`,
    });
  }

  return { groups, totalCredits: grandTotalCredits, warnings };
}

export function parseProgramDetail(
  raw: unknown,
  catalogId = "6349a3f9164d00001c6c80da"
): CatalogProgram {
  if (!isRawProgramDetail(raw)) {
    throw new Error("Invalid Kuali program detail payload");
  }

  const warnings: ParserWarning[] = [];
  const sourcePid = raw.pid || raw.id || "unknown-pid";
  const title = raw.title || "Untitled Program";
  const credential = normalizeCredential(title, raw.programType?.name);
  const slug = createProgramSlug(title, credential);
  const descriptionSummary = raw.description || "";
  const catalogYearLabel = "2025-2026";
  const sourceUrl = `https://snhu.kuali.co/api/v1/catalog/program/${catalogId}/${sourcePid}`;

  const { groups, totalCredits: parsedCredits, warnings: treeWarnings } = parseRequirementTree(
    raw.rulesRequirements || "",
    `program[${sourcePid}]`
  );

  warnings.push(...treeWarnings);

  const totalCredits = parsedCredits > 0 ? parsedCredits : calculateKnownCreditSummary(groups);
  const sourceHash = hashSourcePayload(raw);

  return {
    sourcePid,
    slug,
    title,
    credential,
    catalogId,
    catalogYearLabel,
    totalCredits: totalCredits || null,
    sourceUrl,
    descriptionSummary,
    requirementGroups: groups,
    sourceHash,
    warnings,
  };
}

export function extractCourseReferences(program: CatalogProgram): Array<{ code: string; pid?: string }> {
  const refs = new Map<string, { code: string; pid?: string }>();

  const traverse = (groups: RequirementGroupDomain[]) => {
    for (const group of groups) {
      for (const course of group.courseRequirements) {
        if (!refs.has(course.courseCode)) {
          refs.set(course.courseCode, { code: course.courseCode, pid: course.sourcePid });
        }
      }
      if (group.children.length > 0) {
        traverse(group.children);
      }
    }
  };

  traverse(program.requirementGroups);
  return Array.from(refs.values());
}

export function calculateKnownCreditSummary(groups: RequirementGroupDomain[]): number {
  let sum = 0;
  for (const group of groups) {
    if (group.minimumCredits && group.minimumCredits > 0) {
      sum += group.minimumCredits;
    } else {
      for (const cr of group.courseRequirements) {
        sum += cr.credits || 0;
      }
    }
  }
  return sum;
}
