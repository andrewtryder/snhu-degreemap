"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon, GridIcon } from "lucide-react";
import { ProgramBrowserDialog } from "./ProgramBrowserDialog";
import { Button } from "./ui/Button";
import { BrandBadge } from "./BrandBadge";
import { SNHUToolsNav } from "./SNHUToolsNav";
import { CURRENT_TOOL_ID } from "@/lib/snhuTools";

export interface AppHeaderProps {
  currentPage?: "home" | "programs" | "program-detail" | "about";
  initialPrograms?: Array<{ slug: string; title: string; credential: string; degreeLevel: string; catalogYear: string }>;
}

const searchInputClassName =
  "w-full rounded-full border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface";

export function AppHeader({ currentPage = "home", initialPrograms = [] }: AppHeaderProps) {
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
          <div className="flex items-center gap-3">
            <BrandBadge
              productName="Degree Map"
              ariaLabel="SNHU Degree Map home"
            />

            <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
              <Link
                href="/programs"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  currentPage === "programs"
                    ? "bg-surface-container-lowest font-semibold text-primary shadow-xs"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                Programs
              </Link>
              <Link
                href="/about"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  currentPage === "about"
                    ? "bg-surface-container-lowest font-semibold text-primary shadow-xs"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                About
              </Link>
            </nav>
          </div>

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

          <div className="flex items-center gap-2 lg:col-start-3 lg:row-start-1 lg:justify-self-end">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsBrowserOpen(true)}
              className="min-w-0 flex-1 sm:flex-none"
            >
              <GridIcon className="mr-1.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Browse Programs</span>
            </Button>
            <SNHUToolsNav currentToolId={CURRENT_TOOL_ID} />
          </div>
        </div>
      </header>

      <ProgramBrowserDialog
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        initialPrograms={initialPrograms}
      />
    </>
  );
}
