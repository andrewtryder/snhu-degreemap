import { CourseNodeData } from "@/types/program";

export interface ResolvedPrerequisite {
  code: string;
  title: string | null;
}

export function resolvePrerequisites(
  course: CourseNodeData,
  byId: Map<string, CourseNodeData>,
): ResolvedPrerequisite[] {
  return (course.prerequisites || []).map((reference) => {
    const match =
      byId.get(reference) ||
      [...byId.values()].find(
        (candidate) => candidate.code === reference || candidate.id === reference,
      );

    return {
      code: match?.code || reference,
      title: match?.title || null,
    };
  });
}

export function buildCourseLookup(courses: CourseNodeData[]): Map<string, CourseNodeData> {
  return new Map(courses.map((course) => [course.id, course]));
}
