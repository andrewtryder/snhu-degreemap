export interface TransferCourseSnapshot {
  courseCode: string;
  equivalencyCount: number;
  canonicalUrl: string;
  lastUpdated: string;
  topProviders?: string[];
}

export interface ProgramTransferInsights {
  totalCourses: number;
  transferableCoursesCount: number;
  nonTransferableCoursesCount: number;
  coveragePercentage: number;
  transferableCourseCodes: string[];
  lastSnapshotDate: string;
}
