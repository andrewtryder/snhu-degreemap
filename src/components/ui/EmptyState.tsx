import React from "react";
import { SearchXIcon } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title = "No results found",
  description = "Try adjusting your search criteria or clear your filters.",
  icon = <SearchXIcon className="h-10 w-10 text-outline" />,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center ${className}`}
    >
      <div className="mb-3 rounded-full bg-surface-container p-3">{icon}</div>
      <h3 className="text-base font-bold text-on-surface">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
