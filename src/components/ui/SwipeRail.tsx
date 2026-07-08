import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SwipeRailProps = {
  children: ReactNode;
  className?: string;
};

export function SwipeRail({ children, className }: SwipeRailProps) {
  return (
    <div className={cn("rail-scroll -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0", className)}>
      {children}
    </div>
  );
}
