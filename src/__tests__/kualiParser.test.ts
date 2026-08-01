import { describe, it, expect } from "vitest";
import {
  parseProgramListItem,
  parseProgramDetail,
  parseRequirementTree,
  createProgramSlug,
  normalizeCredential,
  hashSourcePayload,
  extractCourseReferences,
} from "@/lib/kualiParser";

import sampleList from "@/data/fixtures/program-list.sample.json";
import sampleCsProgram from "@/data/fixtures/computer-science-program.sample.json";

describe("kualiParser utility", () => {
  it("generates deterministic kebab-case program slugs", () => {
    expect(createProgramSlug("Computer Science (BS)")).toBe("computer-science-bs");
    expect(createProgramSlug("Nursing (RN to BSN)")).toBe("nursing-rn-to-bsn");
    expect(createProgramSlug("Business Administration", "BS")).toBe("business-administration-bs");
  });

  it("normalizes credentials accurately from titles", () => {
    expect(normalizeCredential("Computer Science (BS)")).toBe("Bachelor of Science");
    expect(normalizeCredential("Psychology (BA)")).toBe("Bachelor of Arts");
    expect(normalizeCredential("Nursing (RN to BSN)")).toBe("Bachelor of Science in Nursing (RN to BSN)");
  });

  it("calculates stable SHA-256 hash of raw payloads", () => {
    const hash1 = hashSourcePayload({ a: 1, b: "test" });
    const hash2 = hashSourcePayload({ a: 1, b: "test" });
    const hash3 = hashSourcePayload({ a: 2, b: "test" });

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
  });

  it("parses program list items cleanly from sample fixture", () => {
    const item = sampleList[0];
    const parsed = parseProgramListItem(item);

    expect(parsed.sourcePid).toBe(item.pid);
    expect(parsed.title).toBe(item.title);
    expect(parsed.slug).toBeDefined();
    expect(parsed.credential).toBeDefined();
    expect(parsed.warnings).toEqual([]);
  });

  it("parses program detail HTML rulesRequirements from Computer Science sample fixture", () => {
    const program = parseProgramDetail(sampleCsProgram);

    expect(program.sourcePid).toBe("V1S14E8tg");
    expect(program.title).toBe("Computer Science (BS)");
    expect(program.slug).toBe("computer-science-bs");
    expect(program.credential).toBe("Bachelor of Science");
    expect(program.requirementGroups.length).toBeGreaterThan(0);

    const firstGroup = program.requirementGroups[0];
    expect(firstGroup.title).toBeDefined();
    expect(firstGroup.category).toBe("gened");
  });

  it("preserves labeled Kuali wrappers and flattens rule-result course lists", () => {
    const program = parseProgramDetail(sampleCsProgram);
    const genEd = program.requirementGroups.find((group) => group.title === "General Education Courses");
    const major = program.requirementGroups.find((group) => group.title === "Major Courses");

    expect(genEd?.rawText).toBeUndefined();
    const cmat = genEd?.children.find((group) => group.title === "Cornerstone Math (CMAT)");
    const esmf = genEd?.children.find((group) => group.title.includes("(ESMF)"));

    expect(cmat?.children).toHaveLength(1);
    expect(cmat?.children[0]).toMatchObject({
      ruleType: "choose_n",
      minimumSelections: 1,
      courseRequirements: [{ courseCode: "MAT 241" }, { courseCode: "MAT 243" }],
    });
    expect(cmat?.children[0].ruleMetadata?.explicitCourseCodes).toEqual(["MAT 241", "MAT 243"]);

    expect(esmf?.children).toHaveLength(1);
    expect(esmf?.children[0].courseRequirements.map((course) => course.courseCode)).toEqual(["MAT 142", "MAT 225"]);

    expect(major?.children.some((group) => group.title === "Complete:")).toBe(false);
    expect(major?.children[0]).toMatchObject({
      ruleType: "choose_n",
      minimumSelections: 1,
      courseRequirements: [{ courseCode: "CS 110" }, { courseCode: "IT 140" }],
    });
  });

  it("parses requirement tree rules (all_of, choose_n, electives)", () => {
    const sampleHtml = `
      <div>
        <section>
          <header><h2><span>General Education</span></h2><span>42 Total Credits</span></header>
          <div>
            <ul>
              <li><span>Complete all of the following</span>
                <ul>
                  <li><a href="#/courses/view/mat140_pid">MAT140</a> - Precalculus (3)</li>
                </ul>
              </li>
            </ul>
          </div>
        </section>
        <section>
          <header><h2><span>Major Electives</span></h2><span>6 Total Credits</span></header>
          <div>
            <ul>
              <li><span>Complete 1 of the following</span>
                <ul>
                  <li><a href="#/courses/view/cs300_pid">CS300</a> - Data Structures (3)</li>
                  <li><a href="#/courses/view/cs305_pid">CS305</a> - Software Security (3)</li>
                </ul>
              </li>
            </ul>
          </div>
        </section>
      </div>
    `;

    const { groups, warnings } = parseRequirementTree(sampleHtml);

    expect(groups).toHaveLength(2);
    expect(groups[0].ruleType).toBe("all_of");
    expect(groups[0].children).toHaveLength(1);
    expect(groups[0].children[0].courseRequirements).toHaveLength(1);
    expect(groups[0].children[0].courseRequirements[0].courseCode).toBe("MAT 140");

    expect(groups[1].ruleType).toBe("all_of");
    expect(groups[1].children[0].ruleType).toBe("choose_n");
    expect(groups[1].children[0].minimumSelections).toBe(1);
    expect(groups[1].children[0].courseRequirements).toHaveLength(2);
    expect(warnings).toHaveLength(0);
  });

  it("extracts unique course references from parsed catalog program", () => {
    const program = parseProgramDetail(sampleCsProgram);
    const refs = extractCourseReferences(program);

    expect(Array.isArray(refs)).toBe(true);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]).toHaveProperty("code");
  });

  it("preserves and structures subject-range rules, alternatives, policy notes, and non-course links", () => {
    const html = `
      <section><header><h2>Major Electives</h2></header><ul>
        <li data-test="ruleView-A">Complete all of the following 12 credit(s) from CS, CYB, DAD, DAT, GAM, or IT within the 200–499 range or from the following courses:
          <a href="#/courses/view/cs510">CS510</a> - Operating Systems
          <a href="#/courses/view/cs530">CS530</a> - Artificial Intelligence
          <a href="#/courses/view/cs550">CS550</a> - Networking
          <a href="#/courses/view/cs590">CS590</a> - Database Design.
          Students selecting a graduate-level course must meet the <a href="https://example.edu/policy">Undergraduates Taking Graduate Courses policy</a>.
        </li>
      </ul></section>`;
    const rule = parseRequirementTree(html).groups[0].children[0];

    expect(rule.minimumCredits).toBe(12);
    expect(rule.ruleMetadata?.eligibleSubjectCodes).toEqual(["CS", "CYB", "DAD", "DAT", "GAM", "IT"]);
    expect(rule.ruleMetadata?.minimumCourseLevel).toBe(200);
    expect(rule.ruleMetadata?.maximumCourseLevel).toBe(499);
    expect(rule.ruleMetadata?.explicitCourseCodes).toEqual(["CS 510", "CS 530", "CS 550", "CS 590"]);
    expect(rule.rawText).toContain("Undergraduates Taking Graduate Courses policy");
    expect(rule.ruleMetadata?.policyNotes?.join(" ")).toContain("must meet");
  });

  it("handles malformed or non-object payloads gracefully with warnings", () => {
    expect(() => parseProgramListItem(null)).toThrow("Invalid Kuali program list item payload");
    expect(() => parseProgramDetail({})).toThrow("Invalid Kuali program detail payload");
  });
});
