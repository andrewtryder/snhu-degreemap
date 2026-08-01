import React from "react";
import { CourseNodeData } from "@/types/program";

function resolvePrerequisiteLabels(course: CourseNodeData, byId: Map<string, CourseNodeData>): string[] {
  return (course.prerequisites || []).map((ref) => {
    const match = byId.get(ref) || [...byId.values()].find((c) => c.code === ref || c.id === ref);
    return match?.code || ref;
  });
}

export function ProgramCourseInventory({ courses }: { courses: CourseNodeData[] }) {
  const byId = new Map(courses.map((course) => [course.id, course]));
  const listed = courses.filter((course) => !course.isPlaceholder);

  if (listed.length === 0) {
    return <p className="text-sm text-on-surface-variant">No resolved course listings are available for this program.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-variant">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Courses in this degree program with known prerequisite links</caption>
        <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Course
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Title
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Credits
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Prerequisites
            </th>
          </tr>
        </thead>
        <tbody>
          {listed.map((course) => {
            const prereqs = resolvePrerequisiteLabels(course, byId);
            return (
              <tr key={course.id} className="border-t border-surface-variant">
                <th scope="row" className="px-3 py-2 font-mono font-semibold text-primary">
                  {course.code}
                  {course.isExternal ? (
                    <span className="ml-2 text-[11px] font-sans font-medium text-on-surface-variant">External</span>
                  ) : null}
                </th>
                <td className="px-3 py-2 text-on-surface">{course.title}</td>
                <td className="px-3 py-2 font-mono text-on-surface-variant">
                  {course.credits == null ? "—" : course.credits}
                </td>
                <td className="px-3 py-2 text-on-surface-variant">
                  {prereqs.length > 0 ? prereqs.join(", ") : "None listed"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
