"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/**
 * Khung bọc Input + phần phụ (icon tìm kiếm, nút, chữ). Viền và focus vẽ ở khung; control bên trong không viền.
 * Dùng cho ô tìm kiếm (Projects), ô nhập có nút hiện/ẩn mật khẩu…
 */
const inputGroupVariants = cva(
  "group/input-group relative flex w-full min-w-0 items-center rounded-md border border-input bg-card text-foreground transition-[border-color] duration-(--duration-base) ease-out has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:focus-visible]:outline-offset-1 has-[[data-slot=input-group-control]:focus-visible]:outline-ring has-[[aria-invalid=true]]:border-destructive has-disabled:opacity-45",
  {
    variants: {
      size: { sm: "h-(--size-control-sm)", md: "h-(--size-control)" },
    },
    defaultVariants: { size: "md" },
  },
);

function InputGroup({ className, size, ...props }: React.ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>) {
  return <div data-slot="input-group" role="group" className={cn(inputGroupVariants({ size }), className)} {...props} />;
}

const inputGroupAddonVariants = cva(
  "flex shrink-0 items-center gap-1.5 text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      align: { "inline-start": "order-first pl-2.5", "inline-end": "order-last pr-1" },
    },
    defaultVariants: { align: "inline-start" },
  },
);

function InputGroupAddon({ className, align, ...props }: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return <div data-slot="input-group-addon" data-align={align} className={cn(inputGroupAddonVariants({ align }), className)} {...props} />;
}

const inputGroupControlVariants = cva(
  "h-full w-full min-w-0 flex-1 border-0 bg-transparent px-2.5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed",
  {
    variants: {
      size: { sm: "text-xs", md: "text-[13px]" },
      mono: { true: "font-mono text-xs placeholder:font-sans placeholder:text-[13px]", false: "" },
    },
    defaultVariants: { size: "md", mono: false },
  },
);

function InputGroupInput({ className, size, mono, ...props }: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputGroupControlVariants>) {
  return <input data-slot="input-group-control" className={cn(inputGroupControlVariants({ size, mono }), className)} {...props} />;
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="input-group-text" className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, inputGroupVariants, inputGroupAddonVariants, inputGroupControlVariants };
