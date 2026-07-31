"use client";

import React from "react";
import { CourseNodeData } from "@/types/program";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, getGroupCategoryVariant } from "@/components/ui/Badge";
import {
  getCoursesUrlForCourse,
  getTransferUrlForCourse,
  getTransferSnapshotForCourse,
} from "@/lib/transferIntegration";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  LayersIcon,
  ExternalLinkIcon,
  ArrowRightLeftIcon,
  InfoIcon,
} from "lucide-react";

export interface CourseDetailDrawerProps {
  course: CourseNodeData | null;
  onClose: () => void;
  allCourses?: CourseNodeData[];
}

export function CourseDetailDrawer({ course, onClose, allCourses = [] }: CourseDetailDrawerProps) {
  if (!course) return null;

  const coursesUrl = getCoursesUrlForCourse(course.code);
  const transferUrl = getTransferUrlForCourse(course.code);
  const transferSnapshot = getTransferSnapshotForCourse(course.code);

  const prereqCourses = (course.prerequisites || [])
    .map((id) => allCourses.find((c) => c.id === id || c.code === id))
    .filter(Boolean) as CourseNodeData[];

  const unlockedCourses = allCourses.filter((c) =>
    (c.prerequisites || []).includes(course.id) || (c.prerequisites || []).includes(course.code)
  );

  return (
    <Dialog
      isOpen={Boolean(course)}
      onClose={onClose}
      title={`${course.code}: ${course.title}`}
      description={`${course.credits} Credits • ${course.groupName}`}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Badges & Cross-Project Links */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getGroupCategoryVariant(course.groupCategory)}>
              {course.groupName}
            </Badge>
            {course.isPlaceholder && (
              <Badge variant="outline">Elective Placeholder</Badge>
            )}
            <Badge variant="neutral">{course.credits} Semester Credits</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {coursesUrl && (
              <a
                href={coursesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View on snhu-courses <ExternalLinkIcon className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Transfer Options Card (snhu-transfers integration) */}
        {transferSnapshot && transferUrl && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <ArrowRightLeftIcon className="h-4 w-4 text-emerald-700" />
                {transferSnapshot.equivalencyCount} Known Transfer Equivalency Options
              </span>
              <a
                href={transferUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline"
              >
                Explore on snhu-transfers <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>

            {transferSnapshot.topProviders && (
              <p className="text-[11px] text-emerald-800">
                Known providers: {transferSnapshot.topProviders.join(", ")}
              </p>
            )}

            <div className="pt-1 text-[11px] text-emerald-800 flex items-start gap-1">
              <InfoIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Transfer data snapshot updated {transferSnapshot.lastUpdated}. All transfer course evaluations require official review and approval by SNHU.
              </span>
            </div>
          </div>
        )}

        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <BookOpenIcon className="h-4 w-4" /> Course Description
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-on-surface">
            {course.description || "No official description available in catalog record."}
          </p>
        </div>

        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <LayersIcon className="h-4 w-4" /> Direct Prerequisites ({prereqCourses.length})
          </h4>
          {prereqCourses.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {prereqCourses.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-surface-variant bg-surface-container-low p-2.5 text-xs"
                >
                  <span className="font-bold text-primary">{req.code}</span>
                  <span className="text-on-surface">{req.title}</span>
                  <Badge size="sm" variant={getGroupCategoryVariant(req.groupCategory)}>
                    {req.groupName}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs italic text-on-surface-variant">
              No prerequisites required. Starting course open for direct enrollment.
            </p>
          )}
        </div>

        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <CheckCircle2Icon className="h-4 w-4 text-tertiary" /> Downstream Dependents ({unlockedCourses.length})
          </h4>
          {unlockedCourses.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {unlockedCourses.map((next) => (
                <li
                  key={next.id}
                  className="flex items-center justify-between rounded-lg border border-surface-variant bg-surface-container-low p-2.5 text-xs"
                >
                  <span className="font-bold text-primary">{next.code}</span>
                  <span className="text-on-surface">{next.title}</span>
                  <Badge size="sm" variant={getGroupCategoryVariant(next.groupCategory)}>
                    {next.groupName}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs italic text-on-surface-variant">
              Does not act as a prerequisite for downstream core courses in this degree map.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-surface-container p-3 text-xs text-on-surface-variant">
          <p className="font-semibold text-on-surface">Degree Requirement Note:</p>
          <p className="mt-0.5">
            Course sequencing and prerequisite enforcement may vary based on SNHU course term availability (8-week online terms vs 16-week campus terms). Always verify your plan with an academic advisor.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
