import React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/Button";
import { SearchXIcon, ArrowLeftIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />

      <main id="main-content" className="flex-1 flex items-center justify-center p-4">
        <div className="mx-auto w-full max-w-md rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center space-y-4">
          <div className="mx-auto inline-flex rounded-full bg-surface-container p-3 text-outline">
            <SearchXIcon className="h-10 w-10" />
          </div>

          <h1 className="font-[family-name:var(--font-headline)] text-xl font-bold text-on-surface">
            Degree Program Not Found
          </h1>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            The requested program slug or catalog URL could not be located in our fixture database.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <Link href="/programs">
              <Button variant="primary" size="sm">
                Browse All Programs
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="mr-1 h-4 w-4" /> Return Home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
