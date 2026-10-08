"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert } from "lucide-react";
import { Slot } from "radix-ui";
import type { FieldError } from "@/client/api/generated/model";
import { cn } from "@/ui/utils";
import { Icon } from "@/ui/primitives/icon";
import { Label } from "@/ui/primitives/label";
import { useErrorText } from "@/ui/molecules/use-error-text";

/**
 * Field.md: nhãn + control + gợi ý + lỗi. `layout="inline"` cho toggle (nhãn trái, Switch phải).
 * Gợi ý một câu `muted-foreground`; lỗi có icon `circle-alert` + chữ `destructive`.
 * `error` nhận `FieldError` của API (dịch theo `errors.<code>`) hoặc chuỗi đã dịch.
 * Control (một phần tử duy nhất) được gắn `id`, `aria-describedby`, `aria-invalid` tự động.
 */
const fieldVariants = cva("flex min-w-0", {
  variants: {
    layout: {
      stack: "flex-col gap-1.5",
      inline: "flex-row items-center justify-between gap-4",
    },
  },
  defaultVariants: { layout: "stack" },
});

type FieldProps = VariantProps<typeof fieldVariants> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: FieldError | string | null;
  /** id của control; mặc định tự sinh. */
  id?: string;
  className?: string;
  children: React.ReactElement;
};

function Field({ label, hint, error, id, layout, className, children }: FieldProps) {
  const autoId = React.useId();
  const controlId = id ?? autoId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const errorText = useErrorText(error);
  const describedBy = [hint ? hintId : null, errorText ? errorId : null].filter(Boolean).join(" ") || undefined;

  const text = (
    <>
      {label ? <Label htmlFor={controlId}>{label}</Label> : null}
      {hint ? (
        <p id={hintId} className="m-0 mt-0.5 text-xs leading-4 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </>
  );

  const control = (
    <Slot.Root id={controlId} aria-describedby={describedBy} aria-invalid={errorText ? true : undefined}>
      {children}
    </Slot.Root>
  );

  const errorLine = errorText ? (
    <p id={errorId} role="alert" className="m-0 mt-0.5 flex items-center gap-1 text-xs leading-4 text-destructive">
      <Icon icon={CircleAlert} size="xs" />
      {errorText}
    </p>
  ) : null;

  if (layout === "inline") {
    return (
      <div data-slot="field" className={cn(fieldVariants({ layout }), className)}>
        <div className="flex min-w-0 flex-col">
          {text}
          {errorLine}
        </div>
        {control}
      </div>
    );
  }

  return (
    <div data-slot="field" className={cn(fieldVariants({ layout }), className)}>
      {label ? <Label htmlFor={controlId}>{label}</Label> : null}
      {control}
      {hint ? (
        <p id={hintId} className="m-0 mt-0.5 text-xs leading-4 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {errorLine}
    </div>
  );
}

export { Field, fieldVariants, type FieldProps };
