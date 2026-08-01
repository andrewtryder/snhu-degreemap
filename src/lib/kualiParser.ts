import crypto from "node:crypto";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { GroupCategory, DegreeLevel } from "@/types/program";
import { isRawProgramListItem, isRawProgramDetail } from "@/types/kualiRaw";
import {
  CatalogProgram,
  RequirementGroupDomain,
  CourseRequirementDomain,
  RuleType,
  ParserWarning,
} from "@/types/domainCatalog";
import { normalizeCourseCode } from "@/lib/courseCode";
import { RequirementRuleMetadata } from "@/types/program";

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

export function normalizeDegreeLevel(credential: string): DegreeLevel {
  const c = credential.toUpperCase();
  if (c.includes("RN TO BSN") || c.includes("RN-TO-BSN")) return "RN to BSN";
  if (c.includes("MBA") || c.includes("MASTER OF BUSINESS")) return "MBA";
  if (c.includes("MFA") || c.includes("MASTER OF FINE ARTS")) return "Other";
  if (c.includes("MED") || c.includes("M.ED") || c.includes("MASTER OF EDUCATION")) return "Other";
  if (c.includes("MASTER OF ARTS") || c.includes(" MA ") || c.endsWith(" MA") || c === "MA") return "MA";
  if (c.includes("MASTER OF SCIENCE") || c.includes(" MS ") || c.endsWith(" MS") || c === "MS") return "MS";
  if (c.includes("BFA") || c.includes("BACHELOR OF FINE ARTS")) return "Other";
  if (c.includes("BBA") || c.includes("BACHELOR OF BUSINESS")) return "Other";
  if (c.includes("BACHELOR OF ARTS") || c.includes(" BA ") || c.endsWith(" BA") || c === "BA") return "BA";
  if (c.includes("BACHELOR OF SCIENCE") || c.includes(" BS ") || c.endsWith(" BS") || c === "BS") return "BS";
  if (c.includes("ASSOCIATE OF ARTS") || c.includes(" AA ") || c.endsWith(" AA") || c === "AA") return "AA";
  if (c.includes("ASSOCIATE OF SCIENCE") || c.includes(" AS ") || c.endsWith(" AS") || c === "AS") return "AS";
  if (c.includes("UNDERGRADUATE CERTIFICATE")) return "Undergraduate Certificate";
  if (c.includes("GRADUATE CERTIFICATE")) return "Graduate Certificate";
  // If it still explicitly says master, bachelor or associate but didn't match the specific BAs/BSs
  if (c.match(/\bMASTER\b/)) return "Other";
  if (c.match(/\bBACHELOR\b/)) return "Other";
  if (c.match(/\bASSOCIATE\b/)) return "Other";
  if (c.match(/\bCERTIFICATE\b/) || c.includes("CERTIF")) return "Other";
  return "Other";
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
  return rawTypeName || "Degree Program";
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
  basePath = "root",
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

      const rootGroup: RequirementGroupDomain = {
        stableSourcePath: sectionPath,
        title: groupTitle,
        category: mapTitleToGroupCategory(groupTitle),
        ruleType: inferRuleType(groupTitle),
        minimumSelections: inferMinimumSelections(groupTitle),
        minimumCredits: groupCredits ?? inferMinimumCredits(groupTitle),
        children: [],
        courseRequirements: [],
        textRequirements: [],
        // A section header is a label, not the catalog rule. Its children retain
        // their own direct source text below.
        rawText: undefined,
        ruleMetadata: undefined,
        warnings: [],
      };

      parseRequirementContainer($, element, rootGroup, sectionPath, true);
      groups.push(rootGroup);
    });
  } catch (err: unknown) {
    warnings.push({
      code: "PARSER_HTML_ERROR",
      message: `Failed to parse rulesRequirements HTML: ${(err as Error).message}`,
    });
  }

  return { groups, totalCredits: grandTotalCredits, warnings };
}

function inferRuleType(text: string): RuleType {
  const normalized = text.toLowerCase();
  if (/free electives?/.test(normalized)) return "free_elective";
  if (/concentration/.test(normalized)) return "concentration";
  if (/\b\d+\s*credit\(s\)\s*from/.test(normalized)) return "choose_credits";
  if (/\b\d+\s+of the following/.test(normalized) || /complete\s+\d+\s+of/.test(normalized)) return "choose_n";
  return "all_of";
}

function inferMinimumSelections(text: string): number | undefined {
  const match = text.match(/(?:complete\s+)?(\d+)\s+of the following/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function inferMinimumCredits(text: string): number | undefined {
  const match = text.match(/(\d+)\s*credit\(s\)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function getDirectRuleText($: cheerio.CheerioAPI, element: Element): string {
  const clone = $(element).clone();
  clone.find("ul, ol").remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

function extractRuleMetadata(sourceText: string, courses: CourseRequirementDomain[]): RequirementRuleMetadata {
  const metadata: RequirementRuleMetadata = sourceText ? { sourceText } : {};
  const creditMatch = sourceText.match(/(\d+)\s*credit\(s\)/i);
  const rangeMatch = sourceText.match(/\b(\d{3})\s*(?:-|–|to)\s*(\d{3})\b/);
  const subjectMatch = sourceText.match(
    /(?:from\s+(?:subject\(s\):\s*)?)([A-Z]{2,4}(?:\s*,\s*[A-Z]{2,4})*(?:\s*,?\s*(?:or|and)\s*[A-Z]{2,4})?)\s+(?:within|from|in)\b/,
  );

  if (creditMatch) metadata.minimumCredits = Number(creditMatch[1]);
  if (rangeMatch) {
    metadata.minimumCourseLevel = Number(rangeMatch[1]);
    metadata.maximumCourseLevel = Number(rangeMatch[2]);
  }
  if (subjectMatch) {
    metadata.eligibleSubjectCodes = subjectMatch[1].match(/\b[A-Z]{2,4}\b/g) || undefined;
  }
  if (courses.length > 0) metadata.explicitCourseCodes = courses.map((course) => course.courseCode);

  const policyNotes = sourceText
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => /\bpolicy\b|must meet|eligibility/i.test(sentence.trim()));
  if (policyNotes.length > 0) metadata.policyNotes = policyNotes;

  return metadata;
}

function parseCourseAnchor(
  $: cheerio.CheerioAPI,
  anchorElement: Element,
  sourcePath: string,
): CourseRequirementDomain | null {
  const anchor = $(anchorElement);
  const courseCode = normalizeCourseCode(anchor.text());
  if (!courseCode) return null;

  const href = anchor.attr("href") || "";
  const pidMatch = href.match(/\/courses\/view\/([a-zA-Z0-9_]+)/);
  const parentLiText = anchor.closest("li").text().replace(/\s+/g, " ").trim();
  const titleText = parentLiText
    .replace(anchor.text(), "")
    .replace(/^\s*-\s*/, "")
    .trim();
  const creditMatch = titleText.match(/\((\d+)(?:\s*-\s*\d+)?\)/);

  return {
    sourcePid: pidMatch ? pidMatch[1] : undefined,
    courseCode,
    title: (creditMatch ? titleText.replace(creditMatch[0], "") : titleText).trim() || courseCode,
    credits: creditMatch ? parseInt(creditMatch[1], 10) : null,
    sourcePath,
  };
}

function directElements($: cheerio.CheerioAPI, owner: Element): Element[] {
  return $(owner)
    .children()
    .toArray()
    .filter((child): child is Element => child.type === "tag");
}

function isRuleView($: cheerio.CheerioAPI, element: Element): boolean {
  return /^ruleView-/.test($(element).attr("data-test") || "");
}

function isGenericWrapper(text: string): boolean {
  return /^(?:complete\s+)?all\s+of\s+the\s+following:?$/i.test(text.replace(/\s+/g, " ").trim());
}

function normalizeRuleTitle(text: string, ruleType: RuleType): string {
  const normalized = text.replace(/\s+/g, " ").trim().replace(/:$/, "");
  if (/^complete$/i.test(normalized)) return "Complete all of the following";
  if (ruleType === "choose_n") {
    const count = inferMinimumSelections(normalized);
    return count ? `Choose ${count} of the following` : normalized || "Choose from the following";
  }
  if (ruleType === "choose_credits") {
    const credits = inferMinimumCredits(normalized);
    return credits
      ? `Complete ${credits} credits from the following`
      : normalized || "Complete credits from the following";
  }
  return normalized || "Complete all of the following";
}

function collectCourses($: cheerio.CheerioAPI, owner: Element, sourcePath: string): CourseRequirementDomain[] {
  const seen = new Set<string>();
  const courses: CourseRequirementDomain[] = [];
  $(owner)
    .find("a[href*='/courses/view/']")
    .each((index, anchor) => {
      const course = parseCourseAnchor($, anchor, `${sourcePath}.course[${index}]`);
      if (course && !seen.has(course.courseCode)) {
        seen.add(course.courseCode);
        courses.push(course);
      }
    });
  return courses;
}

function addCoursesToParent(parent: RequirementGroupDomain, courses: CourseRequirementDomain[]): void {
  const seen = new Set(parent.courseRequirements.map((course) => course.courseCode));
  for (const course of courses) {
    if (!seen.has(course.courseCode)) {
      seen.add(course.courseCode);
      parent.courseRequirements.push(course);
    }
  }
}

function createSemanticRule(
  $: cheerio.CheerioAPI,
  owner: Element,
  parent: RequirementGroupDomain,
  sourcePath: string,
  index: number,
): RequirementGroupDomain {
  const result = $(owner).find("[data-test$='-result']").first().get(0);
  const ruleText = getDirectRuleText($, owner) || (result ? getDirectRuleText($, result) : "");
  const courses = collectCourses($, owner, sourcePath);
  const ruleType = inferRuleType(ruleText);
  const group: RequirementGroupDomain = {
    stableSourcePath: `${sourcePath}.rule[${index}]`,
    title: normalizeRuleTitle(ruleText, ruleType),
    category: parent.category,
    ruleType,
    minimumSelections: inferMinimumSelections(ruleText),
    minimumCredits: inferMinimumCredits(ruleText),
    children: [],
    courseRequirements: courses,
    textRequirements: [],
    rawText: ruleText || undefined,
    warnings: [],
  };
  // Extract after the course list is complete so explicit alternatives are
  // available to persistence and any optional requirement presentation.
  group.ruleMetadata = extractRuleMetadata(ruleText, courses);
  return group;
}

function getWrapperHeading($: cheerio.CheerioAPI, element: Element): string | null {
  if (!$(element).is("div")) return null;
  const span = $(element).children("span").first();
  if (span.length === 0) return null;
  const heading = span.text().replace(/\s+/g, " ").trim();
  if (!heading || /^\d+(?:\s*credit\(s\))?$/i.test(heading)) return null;
  return heading;
}

/**
 * Kuali interleaves invalid-but-browser-tolerated div wrappers and list items.
 * This walks direct DOM children, recognizes a ruleView result as one semantic
 * rule, and intentionally flattens presentation-only "Complete all" wrappers.
 */
function parseRequirementContainer(
  $: cheerio.CheerioAPI,
  owner: Element,
  parent: RequirementGroupDomain,
  parentPath: string,
  skipHeaders = false,
): void {
  let position = 0;
  for (const child of directElements($, owner)) {
    if (skipHeaders && $(child).is("header")) continue;
    const childPath = `${parentPath}.node[${position++}]`;
    const heading = getWrapperHeading($, child);

    if (heading) {
      const subgroup: RequirementGroupDomain = {
        stableSourcePath: `${childPath}.heading`,
        title: heading,
        category: parent.category,
        ruleType: "all_of",
        children: [],
        courseRequirements: [],
        textRequirements: [],
        warnings: [],
      };
      parseRequirementContainer($, child, subgroup, subgroup.stableSourcePath);
      if (subgroup.children.length || subgroup.courseRequirements.length || subgroup.textRequirements.length) {
        parent.children.push(subgroup);
      }
      continue;
    }

    if (isRuleView($, child)) {
      parent.children.push(createSemanticRule($, child, parent, parentPath, position));
      continue;
    }

    if ($(child).is("li")) {
      const directText = getDirectRuleText($, child);
      const nestedRuleViews = $(child).find("[data-test^='ruleView-']").length;
      const directCourses = collectCourses($, child, childPath);

      if (
        directCourses.length > 0 &&
        (inferRuleType(directText) === "choose_n" ||
          inferRuleType(directText) === "choose_credits" ||
          (nestedRuleViews === 0 && isGenericWrapper(directText)))
      ) {
        parent.children.push(createSemanticRule($, child, parent, parentPath, position));
      } else if (isGenericWrapper(directText) || nestedRuleViews > 0) {
        // The outer list item expresses presentation structure only. Its nested
        // ruleView containers own the actual instruction and courses.
        parseRequirementContainer($, child, parent, childPath);
      } else if (directCourses.length > 0) {
        addCoursesToParent(parent, directCourses);
      } else if (directText) {
        parent.textRequirements.push(directText);
      }
      continue;
    }

    if ($(child).is("ul, ol, div")) {
      parseRequirementContainer($, child, parent, childPath);
    }
  }
}

export function parseProgramDetail(raw: unknown, catalogId = "6349a3f9164d00001c6c80da"): CatalogProgram {
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

  const {
    groups,
    totalCredits: parsedCredits,
    warnings: treeWarnings,
  } = parseRequirementTree(raw.rulesRequirements || "", `program[${sourcePid}]`);

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
        const code = normalizeCourseCode(course.courseCode);
        if (code && !refs.has(code)) {
          refs.set(code, { code, pid: course.sourcePid });
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

export function calculateKnownCreditSummary(groups: RequirementGroupDomain[]): number | null {
  let sum = 0;
  for (const group of groups) {
    if (typeof group.minimumCredits === "number" && group.minimumCredits > 0) {
      sum += group.minimumCredits;
    } else {
      for (const cr of group.courseRequirements) {
        if (cr.credits == null) {
          return null; // Partial sum containing unknown components
        }
        sum += cr.credits;
      }
    }
  }
  return sum > 0 ? sum : null;
}
