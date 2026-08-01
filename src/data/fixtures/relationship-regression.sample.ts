import type { RawKualiCourseItem } from "@/types/kualiRaw";

// Catalog-shaped relationship fixtures spanning program families whose rule
// formatting historically produced flat maps. They intentionally include the
// code separators and clause combinations found in Kuali payloads.
export const relationshipRegressionFixtures: Array<{
  discipline: string;
  course: RawKualiCourseItem;
  expectedSource: string;
}> = [
  {
    discipline: "Accounting",
    course: {
      pid: "acct-202",
      code: "ACC-202",
      title: "Accounting II",
      rulesPrerequisites: "Prerequisite: ACC 201 with a grade of C or better.",
    },
    expectedSource: "ACC 201",
  },
  {
    discipline: "Business",
    course: {
      pid: "bus-210",
      code: "BUS210",
      title: "Managing and Leading in Business",
      rulesPrerequisites: "<p>Prerequisites: BUS-206 or BUS\u00a0210A.</p>",
    },
    expectedSource: "BUS 206",
  },
  {
    discipline: "Psychology",
    course: {
      pid: "psy-260",
      code: "PSY 260",
      title: "Statistical Literacy in Psychology",
      rulesPrerequisites: "Prerequisite: PSY-108. Corequisite: MAT 240.",
    },
    expectedSource: "PSY 108",
  },
  {
    discipline: "Nursing",
    course: {
      pid: "nur-400",
      code: "NUR400",
      title: "Nursing Practice",
      rulesPrerequisites: "<div>Prerequisites: NUR 300 and NUR-310.</div>",
    },
    expectedSource: "NUR 300",
  },
  {
    discipline: "Mathematics",
    course: {
      pid: "mat-350",
      code: "MAT-350",
      title: "Applied Linear Algebra",
      rulesPrerequisites: "Prerequisite: MAT230 or MAT 240.",
    },
    expectedSource: "MAT 230",
  },
  {
    discipline: "Graduate Accounting",
    course: {
      pid: "acc-620",
      code: "ACC 620",
      title: "Advanced Accounting",
      rulesPrerequisites: "Prerequisite: ACC500; Corequisite: ACC 610.",
    },
    expectedSource: "ACC 500",
  },
];
