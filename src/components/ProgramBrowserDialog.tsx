"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DegreeLevel } from "@/types/program";
import { GraduationCapIcon, ChevronRightIcon, FilterIcon, Loader2Icon } from "lucide-react";

export interface ProgramBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrograms?: Array<{ slug: string; title: string; credential: string; degreeLevel: string; catalogYear?: string }>;
}

export function ProgramBrowserDialog({ isOpen, onClose, initialPrograms = [] }: ProgramBrowserDialogProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<DegreeLevel | "ALL">("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("2025-2026");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ slug: string; title: string; credential: string; degreeLevel: string }>>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed || trimmed.length < 2) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(() => {
      setIsLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.results) {
            setSearchResults(data.results);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setIsLoading(false);
          }
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  const displayPrograms = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length >= 2 && searchResults.length > 0) {
      return searchResults.filter((p) => selectedLevel === "ALL" || p.degreeLevel === selectedLevel);
    }

    return initialPrograms.filter((program) => {
      const matchesSearch =
        trimmed === "" ||
        program.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        program.credential.toLowerCase().includes(trimmed.toLowerCase()) ||
        program.slug.toLowerCase().includes(trimmed.toLowerCase());

      const matchesLevel = selectedLevel === "ALL" || program.degreeLevel === selectedLevel;
      const matchesYear = selectedYear === "ALL" || program.catalogYear === selectedYear;

      return matchesSearch && matchesLevel && matchesYear;
    });
  }, [searchTerm, searchResults, selectedLevel, selectedYear, initialPrograms]);

  const handleSelectProgram = (slug: string) => {
    onClose();
    router.push(`/programs/${slug}`);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Browse SNHU Degree Programs"
      description="Select a program to view its complete degree map and prerequisite tree."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by program, credential, or course code (e.g. Computer Science, CS 300)..."
          ariaLabel="Search programs in modal"
        />

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-variant bg-surface-container-low p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-on-surface-variant flex items-center gap-1">
              <FilterIcon className="h-3.5 w-3.5" /> Degree Level:
            </span>
            {(["ALL", "BS", "BA", "RN to BSN"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                  selectedLevel === level
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {level === "ALL" ? "All Levels" : level}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-on-surface-variant font-semibold">
            {isLoading ? (
              <span className="flex items-center gap-1 text-primary">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Searching...
              </span>
            ) : (
              <span>{displayPrograms.length} Programs</span>
            )}
          </div>
        </div>

        {/* Scrollable Program List */}
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1" role="list">
          {displayPrograms.length > 0 ? (
            displayPrograms.map((program) => (
              <div
                key={program.slug}
                role="listitem"
                onClick={() => handleSelectProgram(program.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectProgram(program.slug);
                  }
                }}
                tabIndex={0}
                className="group flex items-center justify-between rounded-lg border border-surface-variant bg-surface-container-lowest p-3.5 shadow-xs transition-all hover:border-primary hover:bg-surface-container cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary-fixed/30 p-2 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <GraduationCapIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors text-sm sm:text-base">
                      {program.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {program.credential}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">{program.degreeLevel}</Badge>
                  <ChevronRightIcon className="h-4 w-4 text-outline group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No matching programs found"
              description="Try clearing your search filters or searching for another program name."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchTerm("");
                setSelectedLevel("ALL");
                setSelectedYear("2025-2026");
              }}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}
