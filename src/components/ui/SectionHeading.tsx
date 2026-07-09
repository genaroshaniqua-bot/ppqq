import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, desc, action }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="oc-kicker mb-2 text-[11px] font-black text-primary">{eyebrow}</p> : null}
        <h2 className="oc-title text-2xl font-black leading-[1.08] md:text-[2rem]">{title}</h2>
        {desc ? <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted md:text-base">{desc}</p> : null}
      </div>
      {action ? <div className="hidden shrink-0 md:block">{action}</div> : null}
    </div>
  );
}
