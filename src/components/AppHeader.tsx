"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon, GridIcon } from "lucide-react";
import { ProgramBrowserDialog } from "./ProgramBrowserDialog";
import { Button } from "./ui/Button";

export interface AppHeaderProps {
  currentPage?: "home" | "programs" | "program-detail" | "about";
}

const searchInputClassName =
  "w-full rounded-full border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary";

export function AppHeader({ currentPage = "home" }: AppHeaderProps) {
  const router = useRouter();
  const [globalQuery, setGlobalQuery] = useState("");
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalQuery.trim()) {
      router.push(`/programs?q=${encodeURIComponent(globalQuery.trim())}`);
    } else {
      router.push("/programs");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-surface-variant bg-surface">
        <div className="mx-auto grid w-full max-w-[var(--spacing-container-max)] grid-cols-1 gap-3 px-4 py-3 md:px-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          {/* Brand Home Link */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex shrink-0 items-baseline gap-2 justify-self-start rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 no-underline transition-colors hover:border-primary hover:bg-surface-container"
              aria-label="SNHU Degree Map home"
            >
              <span className="font-[family-name:var(--font-headline)] text-lg font-bold leading-none text-primary">
                SNHU
              </span>
              <span className="font-[family-name:var(--font-headline)] text-sm font-semibold leading-none tracking-wide text-on-surface">
                Degree Map
              </span>
            </Link>

            {/* Desktop Quick Nav */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
              <Link
                href="/programs"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentPage === "programs"
                    ? "bg-surface-container-lowest text-primary font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                Programs
              </Link>
              <Link
                href="/about"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  currentPage === "about"
                    ? "bg-surface-container-lowest text-primary font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                About
              </Link>
            </nav>
          </div>

          {/* Wide Global Search Form */}
          <div className="lg:col-start-2 lg:row-start-1">
            <form onSubmit={handleGlobalSearch} role="search" className="relative w-full min-w-0">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                aria-label="Search degree programs, courses, or requirements"
                className={searchInputClassName}
                placeholder="Search programs, courses, or prerequisites (e.g. Computer Science, CS 300)..."
              />
            </form>
          </div>

          {/* Action Button & Browse Dialog Trigger */}
          <div className="flex items-center gap-2 lg:col-start-3 lg:row-start-1 lg:justify-self-end">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsBrowserOpen(true)}
              className="w-full sm:w-auto"
            >
              <GridIcon className="mr-1.5 h-4 w-4 shrink-0" />
              <span>Browse Programs</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Program Browser Dialog Modal */}
      <ProgramBrowserDialog isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)} />
    </>
  );
}
