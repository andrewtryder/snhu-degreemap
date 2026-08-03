import { DegreeProgram } from "@/types/program";
import { Card } from "@/components/ui/Card";
import { getProgramTransferCoverage, parseCoverageUpdatedAt } from "@/lib/transferCoverage.server";

export async function ProgramTransferCoverage({ program }: { program: DegreeProgram }) {
  const result = await getProgramTransferCoverage(program);

  if (result.status === "unavailable") {
    return (
      <Card className="min-h-[5.5rem] border-surface-variant space-y-2">
        <h2 className="text-sm font-bold text-on-surface">Transfer Integration</h2>
        <p className="text-xs text-on-surface-variant">
          Transfer-equivalency coverage is temporarily unavailable.
        </p>
      </Card>
    );
  }

  const matched = result.data.courses.filter((course) => course.hasTransferEquivalencies);
  const updatedAt = parseCoverageUpdatedAt(result.data.dataLastUpdatedAt);

  return (
    <Card className="min-h-[5.5rem] border-emerald-200 bg-emerald-50/50 space-y-2">
      <h2 className="text-sm font-bold text-emerald-950">Transfer Integration</h2>

      <p className="text-xs text-emerald-900">
        {matched.length} of {result.data.requestedCourseCount} identified program courses have known
        transfer listings.
      </p>

      {updatedAt ? (
        <p className="text-[11px] text-emerald-800">
          Transfer data last updated{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(updatedAt)}
        </p>
      ) : null}

      {matched.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs font-semibold text-emerald-900 self-center mr-1">
            Courses with known transfer listings:
          </span>
          {matched.map((course) => (
            <a
              key={course.courseCode}
              href={course.courseUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View transfer equivalencies for ${course.displayCourseCode}`}
              className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {course.displayCourseCode}
            </a>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
