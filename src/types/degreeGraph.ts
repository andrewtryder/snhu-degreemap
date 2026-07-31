import { CourseNodeData, PrerequisiteEdgeData } from "./program";

export type DegreeNodeType =
  | "course"
  | "elective_placeholder"
  | "requirement_group"
  | "informational"
  | "unparsed_requirement";

export type DegreeEdgeType =
  | "prerequisite"
  | "corequisite"
  | "recommended"
  | "requirement_membership";

export interface DegreeGraphNodeData extends CourseNodeData {
  nodeType: DegreeNodeType;
  isStartingCourse?: boolean;
  isCriticalPath?: boolean;
  depth?: number;
  inDegree?: number;
  outDegree?: number;
}

export interface DegreeGraphEdgeData extends PrerequisiteEdgeData {
  edgeType: DegreeEdgeType;
}

export interface DegreeGraphInsights {
  startingCourses: string[]; // Course codes with in-degree = 0
  criticalCourses: string[]; // Courses required by 2+ downstream courses
  longestPath: string[]; // Longest prerequisite chain of course codes
  longestPathLength: number;
  hasCycle: boolean;
  cycleNodes?: string[];
  totalKnownCourses: number;
}

export interface CompleteDegreeGraph {
  nodes: DegreeGraphNodeData[];
  edges: DegreeGraphEdgeData[];
  insights: DegreeGraphInsights;
}
