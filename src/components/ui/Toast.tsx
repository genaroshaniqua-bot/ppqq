import { CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  tone?: "success" | "info";
};

export function Toast({ message, tone = "success" }: ToastProps) {
  if (!message) return null;

  const Icon = tone === "success" ? CheckCircle2 : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-24 left-1/2 z-50 flex min-h-11 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-pill px-4 py-3 text-sm font-bold shadow-soft md:bottom-6",
        tone === "success" ? "bg-ink text-white" : "bg-white text-ink"
      )}
    >
      <Icon size={18} aria-hidden="true" />
      {message}
    </div>
  );
}
