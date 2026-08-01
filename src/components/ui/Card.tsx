import React from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", hoverable = false, style }: CardProps) {
  const hoverClass = hoverable ? "transition-all duration-200 hover:border-primary hover:shadow-md" : "";

  return (
    <div
      style={style}
      className={`rounded-lg border border-surface-variant bg-surface-container-lowest p-5 shadow-xs ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}
