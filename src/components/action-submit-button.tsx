"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

type ActionSubmitButtonProps = ButtonProps & {
  pendingText?: string;
  pendingDescription?: string;
  showDialog?: boolean;
};

export function ActionSubmitButton({
  children,
  pendingText,
  pendingDescription = "Please wait while we process your request.",
  showDialog = true,
  disabled,
  ...props
}: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();
  const label = pending ? pendingText ?? children : children;

  return (
    <>
      <Button {...props} type="submit" disabled={disabled || pending}>
        <span className="inline-flex items-center gap-2">
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          <span>{label}</span>
        </span>
      </Button>

      {showDialog && pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-[var(--surface)]/95 p-6 text-center shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
            </div>
            <p className="mt-4 text-lg font-semibold">{pendingText ?? "Processing..."}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{pendingDescription}</p>
          </div>
        </div>
      )}
    </>
  );
}
