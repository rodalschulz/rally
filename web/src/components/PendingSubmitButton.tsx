"use client";

import { Spinner } from "@/components/Spinner";
import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  /** Soft / destructive look helpers are just className */
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

/** Submit button that shows a spinner while the parent form action is pending. */
export function PendingSubmitButton({
  children,
  className = "",
  pendingLabel,
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  const busy = pending || disabled;

  return (
    <button
      type="submit"
      disabled={busy}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-60 ${className}`}
      aria-busy={pending}
      {...rest}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
