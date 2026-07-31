import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseDetailDrawer } from "@/components/graph/CourseDetailDrawer";
import type { CourseNodeData } from "@/types/program";

const failedCourse: CourseNodeData = {
  id: "PSY300",
  code: "PSY 300",
  title: "Research Methods",
  credits: 3,
  groupCode: "major",
  groupName: "Major",
  groupCategory: "major",
  prerequisites: [],
  corequisites: ["MAT240"],
  resolutionStatus: "failed",
};

const corequisite: CourseNodeData = {
  id: "MAT240",
  code: "MAT 240",
  title: "Applied Statistics",
  credits: 3,
  groupCode: "external",
  groupName: "External Prerequisites",
  groupCategory: "other",
  isExternal: true,
  resolutionStatus: "unavailable",
};

describe("CourseDetailDrawer relationship uncertainty", () => {
  it("separates corequisites and never calls an unresolved course a starting course", () => {
    render(<CourseDetailDrawer course={failedCourse} onClose={() => undefined} allCourses={[failedCourse, corequisite]} />);

    expect(screen.getByText(/Catalog course details could not be resolved/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct Corequisites \(1\)/)).toBeInTheDocument();
    expect(screen.getByText("MAT 240")).toBeInTheDocument();
    expect(screen.getByText(/Prerequisite relationships are unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/Starting course open for direct enrollment/i)).not.toBeInTheDocument();
  });
});
