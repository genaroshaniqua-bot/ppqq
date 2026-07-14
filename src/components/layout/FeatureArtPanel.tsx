import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureArtPanelProps = {
  src: string;
  alt: string;
  eyebrow: string;
  caption: string;
  className?: string;
  priority?: boolean;
};

export function FeatureArtPanel({
  src,
  alt,
  eyebrow,
  caption,
  className,
  priority = false
}: FeatureArtPanelProps) {
  return (
    <figure
      className={cn(
        "group relative min-h-[190px] overflow-hidden rounded-[26px] border border-white/12 bg-[#e9eeee] shadow-[0_18px_45px_rgba(18,16,22,0.14)]",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 1023px) 100vw, 420px"
        className="object-cover transition duration-700 group-hover:scale-[1.025]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/82 via-ink/8 to-transparent" aria-hidden="true" />
      <figcaption className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-lime">
          <Sparkles size={12} aria-hidden="true" />
          {eyebrow}
        </span>
        <strong className="mt-1 block max-w-sm text-sm font-black leading-6 sm:text-base">{caption}</strong>
      </figcaption>
    </figure>
  );
}
