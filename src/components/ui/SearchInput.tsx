import React from "react";
import { SearchIcon, XIcon } from "lucide-react";

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search programs, courses, or requirements...",
  ariaLabel = "Search",
  onClear,
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-full border border-outline-variant bg-surface-container-low py-2 pl-9 pr-8 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
