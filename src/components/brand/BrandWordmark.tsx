import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
};

export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span className={cn("brand-wordmark", className)} aria-label="WEIMING">
      <span className="brand-wordmark__lead" aria-hidden="true">WEI</span>
      <span className="brand-wordmark__tail" aria-hidden="true">MING</span>
    </span>
  );
}
