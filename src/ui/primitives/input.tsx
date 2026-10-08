import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/**
 * Input.md: ô nhập một dòng trên `color-card`, viền `color-input`.
 * `mono` cho API key, đường dẫn, ID, arguments; `invalid` viền `destructive` (luôn đi kèm Field có `error`).
 */
const inputVariants = cva(
  "w-full min-w-0 rounded-md border border-input bg-card px-3 text-foreground transition-[border-color] duration-(--duration-base) ease-out placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-45 read-only:bg-muted aria-invalid:border-destructive file:mr-2 file:border-0 file:bg-transparent file:text-[13px] file:font-medium",
  {
    variants: {
      size: { sm: "h-(--size-control-sm) text-xs", md: "h-(--size-control) text-[13px]" },
      mono: { true: "font-mono text-xs placeholder:font-sans placeholder:text-[13px]", false: "" },
      invalid: { true: "border-destructive", false: "" },
    },
    defaultVariants: { size: "md", mono: false, invalid: false },
  },
);

type InputProps = Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>;

function Input({ className, type, size, mono, invalid, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(inputVariants({ size, mono, invalid }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants, type InputProps };
