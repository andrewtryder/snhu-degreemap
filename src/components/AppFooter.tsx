import React from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-surface-variant bg-surface-container-lowest text-on-surface-variant">
      <div className="mx-auto w-full max-w-[var(--spacing-container-max)] px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand & Purpose */}
          <div>
            <Link
              href="/"
              className="inline-flex items-baseline gap-2 text-base font-bold text-primary no-underline"
            >
              <span className="font-[family-name:var(--font-headline)] text-lg">SNHU</span>
              <span className="font-[family-name:var(--font-headline)] text-sm font-semibold text-on-surface">
                Degree Map
              </span>
            </Link>
            <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
              An unofficial degree-requirement and course prerequisite visualization tool designed to help students explore curriculum maps, required courses, and academic paths.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Navigation & Resources
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/programs" className="hover:text-primary hover:underline">
                  Browse All Degree Programs
                </Link>
              </li>
              <li>
                <Link href="/programs/computer-science-bs" className="hover:text-primary hover:underline">
                  Computer Science (BS) Map
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary hover:underline">
                  About SNHU Degree Map
                </Link>
              </li>
              <li>
                <a
                  href={siteConfig.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline inline-flex items-center gap-1"
                >
                  GitHub Repository (andrewtryder/snhu-degreemap)
                </a>
              </li>
            </ul>
          </div>

          {/* Unofficial Disclaimer & Build Date */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Disclaimer & Status
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
              <strong>Unofficial Tool:</strong> SNHU Degree Map is an independent project. It is not affiliated with, endorsed by, or sponsored by Southern New Hampshire University (SNHU). Always verify your official degree plan and prerequisite status with an SNHU academic advisor.
            </p>
            <p className="mt-3 text-[11px] text-outline">
              <Link href="/data-status" className="hover:text-primary hover:underline font-semibold">View Catalog Data Status</Link>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-surface-variant pt-6 text-center text-xs text-outline">
          <p>© {new Date().getFullYear()} SNHU Degree Map. Open-source educational project.</p>
        </div>
      </div>
    </footer>
  );
}
