"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type ToastState = {
  tone: "success" | "error";
  message: string;
};

export function ActionFeedbackToast() {
  const searchParams = useSearchParams();
  const toast = useMemo<ToastState | null>(() => {
    const error = searchParams.get("error");
    if (error) {
      return { tone: "error", message: error };
    }

    const success = searchParams.get("success");
    if (success) {
      return { tone: "success", message: success };
    }

    return null;
  }, [searchParams]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed right-4 top-20 z-50 max-w-sm animate-[toast-in-out_3.6s_ease_forwards] sm:right-6",
      )}
    >
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur",
          toast.tone === "success"
            ? "border-emerald-300/60 bg-emerald-50/95 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-950/85 dark:text-emerald-50"
            : "border-rose-300/60 bg-rose-50/95 text-rose-900 dark:border-rose-700/70 dark:bg-rose-950/85 dark:text-rose-50",
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em]">
          {toast.tone === "success" ? "Success" : "Action failed"}
        </p>
        <p className="mt-1 text-sm">{toast.message}</p>
      </div>
    </div>
  );
}
