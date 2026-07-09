"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { creatorServices } from "@/data/mock-platform";
import { cn } from "@/lib/utils";
import type { CommissionStatus, CreatorService } from "@/types/platform";

const statuses: Array<CommissionStatus | "全部"> = ["全部", "可接单", "排队中", "暂停接单"];

export default function CommissionsPage() {
  const [status, setStatus] = useState<CommissionStatus | "全部">("全部");
  const [selected, setSelected] = useState<CreatorService>(creatorServices[0]);
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => creatorServices.filter((service) => status === "全部" || service.status === status), [status]);

  function requestService(service: CreatorService) {
    setSelected(service);
    setToast("已创建 mock 委托请求草稿");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-7 rounded-[36px] border border-line bg-white p-6 shadow-soft md:p-8">
        <p className="text-xs font-black uppercase text-primary">Commissions</p>
        <h1 className="mt-2 font-display text-4xl font-black md:text-6xl">找创作者</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          先从创作者服务卡片开始筛选，再进入创作者主页查看样例、规则和排期。当前委托请求只做前端演示。
        </p>
      </section>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {statuses.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={cn(
              "min-h-11 shrink-0 rounded-pill px-4 text-sm font-black transition",
              status === item ? "bg-ink text-white" : "bg-white text-muted shadow-soft hover:bg-primary/15 hover:text-ink"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.58fr_0.42fr]">
        <section className="grid gap-4 sm:grid-cols-2">
          {filtered.map((service) => (
            <article key={service.id} className="rounded-card border border-line bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  onClick={() => setSelected(service)}
                  className="grid size-16 place-items-center rounded-card text-ink"
                  style={{ backgroundColor: service.accent }}
                  aria-label={`查看 ${service.title}`}
                >
                  <BriefcaseBusiness size={25} aria-hidden="true" />
                </button>
                <span className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">{service.status}</span>
              </div>
              <p className="mt-5 text-xs font-black text-primary">{service.category}</p>
              <h2 className="mt-2 font-display text-2xl font-black">{service.title}</h2>
              <p className="mt-2 text-sm font-bold text-muted">{service.creator} · {service.priceRange}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{service.sample}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
                  <Clock size={15} aria-hidden="true" />
                  {service.turnaround}
                </span>
                <Button type="button" variant="secondary" onClick={() => requestService(service)}>
                  <Send size={16} aria-hidden="true" />
                  发起 mock 委托
                </Button>
              </div>
            </article>
          ))}
        </section>

        <aside className="h-fit rounded-card border border-line bg-white p-5 shadow-soft lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase text-primary">Creator Profile</p>
          <h2 className="mt-2 font-display text-3xl font-black">{selected.creator}</h2>
          <p className="mt-2 text-sm font-bold text-muted">{selected.title} · {selected.priceRange}</p>
          <p className="mt-4 text-sm leading-7 text-muted">{selected.sample}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {selected.tags.map((tag) => (
              <span key={tag} className="rounded-pill bg-bg px-3 py-1 text-xs font-black text-muted">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-card bg-bg p-4">
            <h3 className="text-sm font-black">接单规则</h3>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-muted">
              {selected.rules.map((rule) => (
                <li key={rule}>· {rule}</li>
              ))}
            </ul>
          </div>
          <p className="mt-5 rounded-card bg-lime/35 p-4 text-sm font-black text-ink">委托记录当前只保存为前端演示状态，不产生真实付款或排期。</p>
        </aside>
      </div>

      <Toast message={toast} />
    </div>
  );
}
