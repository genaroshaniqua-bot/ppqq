import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill px-5 py-3 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-white shadow-soft hover:bg-primary hover:text-ink",
        variant === "secondary" && "bg-white text-ink shadow-soft hover:bg-primary/15",
        variant === "ghost" && "bg-transparent text-ink hover:bg-white",
        variant === "danger" && "bg-danger text-white shadow-soft hover:bg-danger/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
