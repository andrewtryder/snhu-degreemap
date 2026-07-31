import React from "react";
import { GroupCategory } from "@/types/program";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "gened" | "core" | "major" | "elective" | "outline" | "neutral" | "warning";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "neutral", size = "md", className = "" }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    gened: "bg-[#dbe1ff] text-[#001d59] border-[#003087]",
    core: "bg-[#e8f5e9] text-[#002908] border-[#004112]",
    major: "bg-[#f3e8ff] text-[#581c87] border-[#7e22ce]",
    elective: "bg-[#fef3c7] text-[#78350f] border-[#d97706]",
    neutral: "bg-surface-container text-on-surface-variant border-surface-variant",
    outline: "border border-outline-variant text-on-surface-variant bg-transparent",
    warning: "bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.2 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
  };

  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide transition-colors ${sizeStyles[size]} ${style} ${className}`}
    >
      {children}
    </span>
  );
}

export function getGroupCategoryVariant(category: GroupCategory): BadgeProps["variant"] {
  switch (category) {
    case "gened":
      return "gened";
    case "core":
      return "core";
    case "major":
      return "major";
    case "elective":
      return "elective";
    default:
      return "neutral";
  }
}
