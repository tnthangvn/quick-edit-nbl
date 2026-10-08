"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/**
 * Textarea. `autosize`: tự co giãn theo nội dung tới `max-h-[200px]` rồi cuộn (Composer).
 * Dùng `field-sizing: content`; trình duyệt chưa hỗ trợ thì đo `scrollHeight` khi gõ.
 * `appearance="bare"`: không viền/nền, để khung bên ngoài (Composer) vẽ viền và focus.
 */
const textareaVariants = cva("block w-full min-w-0 text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-45", {
  variants: {
    appearance: {
      default:
        "rounded-md border border-input bg-card px-3 py-2 text-[13px] leading-5 transition-[border-color] duration-(--duration-base) ease-out aria-invalid:border-destructive",
      bare: "border-0 bg-transparent p-0 text-sm leading-5 outline-none focus-visible:outline-none",
    },
    autosize: {
      true: "field-sizing-content max-h-[200px] resize-none overflow-y-auto",
      false: "min-h-20 resize-y",
    },
    mono: { true: "font-mono text-xs leading-[18px]", false: "" },
    invalid: { true: "border-destructive", false: "" },
  },
  defaultVariants: { appearance: "default", autosize: false, mono: false, invalid: false },
});

type TextareaProps = React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>;

const supportsFieldSizing = () => typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

function Textarea({ className, appearance, autosize, mono, invalid, onInput, ref, ...props }: TextareaProps) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const fit = React.useCallback(() => {
    const el = innerRef.current;
    if (!el || !autosize || supportsFieldSizing()) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autosize]);

  React.useLayoutEffect(fit, [fit, props.value]);

  const setRef = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <textarea
      ref={setRef}
      data-slot="textarea"
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(textareaVariants({ appearance, autosize, mono, invalid }), className)}
      onInput={(e) => {
        fit();
        onInput?.(e);
      }}
      {...props}
    />
  );
}

export { Textarea, textareaVariants, type TextareaProps };
