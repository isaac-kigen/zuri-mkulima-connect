import * as React from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "error";

const styles: Record<AlertVariant, string> = {
  info: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]",
  success: "border-[#bfebcf] bg-[#f2fbf5] text-[#1f7a3d]",
  warning: "border-[#ffe0a8] bg-[#fffaf0] text-[#9a6700]",
  error: "border-[#f4b4b4] bg-[#fff5f5] text-[#b42318]",
};

export function Alert({
  className,
  variant = "info",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      className={cn("rounded-xl border px-4 py-3 text-sm", styles[variant], className)}
      {...props}
    />
  );
}
