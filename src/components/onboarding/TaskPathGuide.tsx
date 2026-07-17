import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskPath = {
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
  href: string;
  action: string;
  icon: LucideIcon;
  emphasis?: "primary" | "dark";
};

export function TaskPathGuide({
  eyebrow = "第一次使用？从目标开始",
  title,
  description,
  paths
}: {
  eyebrow?: string;
  title: string;
  description: string;
  paths: TaskPath[];
}) {
  return (
    <section className="mb-7 rounded-[30px] border border-line bg-white p-5 shadow-soft sm:p-6" aria-labelledby="task-path-title">
      <div className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h1 id="task-path-title" className="mt-2 font-display text-3xl font-black tracking-[-0.025em] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted sm:text-base">{description}</p>
      </div>

      <div className={cn("mt-5 grid gap-3", paths.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
        {paths.map((path) => {
          const Icon = path.icon;
          const dark = path.emphasis === "dark";
          return (
            <article key={path.title} className={cn("flex flex-col rounded-[22px] border p-4 sm:p-5", dark ? "border-ink bg-ink text-white" : "border-line bg-bg text-ink")}>
              <div className="flex items-start gap-3">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", dark ? "bg-lime text-ink" : "bg-white text-primary shadow-soft")}>
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div>
                  <p className={cn("text-[11px] font-black uppercase tracking-[0.12em]", dark ? "text-lime" : "text-primary")}>{path.eyebrow}</p>
                  <h2 className="mt-1 font-display text-xl font-black">{path.title}</h2>
                </div>
              </div>
              <p className={cn("mt-3 text-sm font-semibold leading-6", dark ? "text-white/64" : "text-muted")}>{path.description}</p>
              <ol className="mt-4 flex flex-wrap gap-2" aria-label={`${path.title}流程`}>
                {path.steps.map((step, index) => (
                  <li key={step} className={cn("inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-black", dark ? "bg-white/8 text-white/76" : "bg-white text-muted")}>
                    <span className={cn("grid size-5 place-items-center rounded-full text-[10px]", dark ? "bg-lime text-ink" : "bg-ink text-white")}>{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <Link href={path.href} className={cn("mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-black transition", dark ? "bg-lime text-ink hover:bg-primary" : "bg-white text-ink shadow-soft hover:bg-primary hover:text-white")}>
                {path.action}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
