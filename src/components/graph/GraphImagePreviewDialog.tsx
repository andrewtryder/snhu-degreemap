"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { DownloadIcon, PrinterIcon } from "lucide-react";
import { downloadPngDataUrl, printPngImage } from "@/lib/renderReactFlowToPng";

export interface GraphImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programTitle: string;
  catalogYear?: string;
  dataUrl: string | null;
  width?: number;
  height?: number;
  isLoading?: boolean;
  error?: string | null;
}

export function GraphImagePreviewDialog({
  isOpen,
  onClose,
  programTitle,
  catalogYear,
  dataUrl,
  width,
  height,
  isLoading = false,
  error = null,
}: GraphImagePreviewDialogProps) {
  const description = catalogYear ? `Catalog Year: ${catalogYear}` : undefined;

  const handleDownload = () => {
    if (!dataUrl) return;
    downloadPngDataUrl(dataUrl, programTitle);
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    printPngImage({ dataUrl, programTitle, catalogYear });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={programTitle} description={description} maxWidth="4xl">
      <div className="space-y-4" aria-live="polite">
        {isLoading && (
          <p className="text-sm text-on-surface-variant" role="status">
            Rendering graph image…
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
            {error}
          </p>
        )}

        {dataUrl && !isLoading && (
          <>
            {width && height && (
              <p className="text-xs text-on-surface-variant">
                Image size: {width} × {height}px
              </p>
            )}
            <div className="overflow-auto rounded-lg border border-surface-variant bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrl}
                alt={`Degree map preview for ${programTitle}`}
                className="mx-auto max-h-[55vh] w-auto max-w-full"
              />
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!dataUrl || isLoading}>
            <DownloadIcon className="mr-1.5 h-4 w-4" /> Download PNG
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} disabled={!dataUrl || isLoading}>
            <PrinterIcon className="mr-1.5 h-4 w-4" /> Print Image
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
