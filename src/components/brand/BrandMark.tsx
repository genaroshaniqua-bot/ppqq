import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block shrink-0", className)}
    >
      <Image src="/brand/weimingshe-mark.png" alt="" fill sizes="64px" className="scale-[1.26] object-contain" />
    </span>
  );
}
