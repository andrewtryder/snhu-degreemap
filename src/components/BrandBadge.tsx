import Link from "next/link";

interface BrandBadgeProps {
  productName: string;
  href?: string;
  ariaLabel: string;
}

const badgeClassName =
  "inline-flex shrink-0 items-baseline gap-2 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 no-underline transition-colors hover:border-primary hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function BrandBadge({ productName, href = "/", ariaLabel }: BrandBadgeProps) {
  return (
    <Link href={href} className={badgeClassName} aria-label={ariaLabel}>
      <span className="font-[family-name:var(--font-headline)] text-lg font-bold leading-none text-primary">
        SNHU
      </span>
      <span className="font-[family-name:var(--font-headline)] text-sm font-semibold leading-none tracking-wide text-on-surface">
        {productName}
      </span>
    </Link>
  );
}
