import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-[var(--primary-soft)] text-[var(--primary-strong)] border border-[var(--primary-border)]",
  secondary:
    "bg-[var(--surface-muted)] text-[var(--foreground)] border border-[var(--border)]",
  success: "bg-[#e9f7ef] text-[#1f7a3d] border border-[#bfebcf]",
  warning: "bg-[#fff4df] text-[#9a6700] border border-[#ffe0a8]",
  danger: "bg-[#fde8e8] text-[#b42318] border border-[#f4b4b4]",
  outline: "bg-transparent text-[var(--foreground)] border border-[var(--border)]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
