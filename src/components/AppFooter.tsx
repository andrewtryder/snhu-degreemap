import React from "react";
import Link from "next/link";

export function formatCatalogLastUpdated(lastUpdated: Date | string | null): string {
  if (!lastUpdated) return "Last Updated: Not available";

  const parsedDate = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
  if (Number.isNaN(parsedDate.getTime())) return "Last Updated: Not available";

  return `Last Updated: ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsedDate)}`;
}

export function AppFooter({ lastUpdated = null }: { lastUpdated?: Date | string | null }) {

  return (
    <footer className="mt-16 border-t border-surface-variant bg-surface-container-lowest text-on-surface-variant">
      <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Navigation & Resources
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/programs/associate" className="hover:text-primary hover:underline">
                  Browse All Associate Programs
                </Link>
              </li>
              <li>
                <Link href="/programs/bachelors" className="hover:text-primary hover:underline">
                  Browse All Bachelor’s Programs (BA & BS)
                </Link>
              </li>
              <li>
                <Link href="/programs/graduate" className="hover:text-primary hover:underline">
                  Browse All Graduate Programs
                </Link>
              </li>
              <li>
                <Link href="/programs/certificates" className="hover:text-primary hover:underline">
                  Browse Certificate Programs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Disclaimer
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
              SNHU Degree Map is an independent, unofficial project. It is not affiliated with, endorsed by, or operated by Southern New Hampshire University (SNHU). Confirm degree requirements and prerequisites with the official catalog and an academic advisor.
            </p>
            <p className="mt-3 text-[11px] text-outline">
              <Link href="/about" className="hover:text-primary hover:underline font-semibold">About SNHU Degree Map</Link>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-surface-variant pt-6 text-center text-xs text-outline">
          <p>{formatCatalogLastUpdated(lastUpdated)}</p>
        </div>
      </div>
    </footer>
  );
}
