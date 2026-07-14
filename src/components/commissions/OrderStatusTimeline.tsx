import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = "pending_deposit" | "in_progress" | "draft_review" | "revision_requested" | "final_review" | "pending_balance" | "completed" | "cancelled" | "disputed";
const steps = [
  { key: "pending_deposit", label: "确认定金" },
  { key: "in_progress", label: "开始创作" },
  { key: "draft_review", label: "草稿审核" },
  { key: "final_review", label: "成稿验收" },
  { key: "pending_balance", label: "支付尾款" },
  { key: "completed", label: "完成" }
];
const statusIndex: Record<OrderStatus, number> = { pending_deposit: 0, in_progress: 1, draft_review: 2, revision_requested: 2, final_review: 3, pending_balance: 4, completed: 5, cancelled: -1, disputed: -1 };

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "disputed") {
    return <div className={cn("mt-4 flex items-center gap-2 rounded-[14px] px-3 py-2 text-xs font-black", status === "disputed" ? "bg-danger/10 text-danger" : "bg-white text-muted")}><CircleAlert size={15} />{status === "disputed" ? "订单已冻结，等待管理员仲裁" : "订单已经关闭"}</div>;
  }
  const current = statusIndex[status];
  return <ol className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="订单进度">{steps.map((step, index) => { const done = index < current || status === "completed"; const active = index === current && status !== "completed"; return <li key={step.key} className="flex min-w-[92px] flex-1 items-center gap-2"><span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black", done ? "bg-primary text-white" : active ? "bg-lime text-ink ring-2 ring-lime/30" : "bg-white text-muted")}>{done ? <Check size={12} /> : index + 1}</span><span className={cn("text-[11px] font-black", active ? "text-ink" : "text-muted")}>{step.label}</span></li>; })}</ol>;
}
