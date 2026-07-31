import React from "react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "tertiary";
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  variant = "default",
  className = "",
}: MetricCardProps) {
  const variantStyles = {
    default: "border-surface-variant bg-surface-container-lowest",
    primary: "border-primary-fixed-dim bg-primary-fixed/20 text-primary",
    secondary: "border-secondary-fixed-dim bg-secondary-fixed/20 text-secondary",
    tertiary: "border-tertiary-fixed-dim bg-tertiary-fixed/20 text-tertiary",
  };

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 shadow-xs ${variantStyles[variant]} ${className}`}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-on-surface">{value}</p>
        {subtext && <p className="mt-0.5 text-xs text-on-surface-variant">{subtext}</p>}
      </div>
      {icon && (
        <div className="rounded-lg bg-surface-container p-2.5 text-primary shrink-0">{icon}</div>
      )}
    </div>
  );
}
