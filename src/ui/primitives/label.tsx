"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/** Nhãn field: `label` 13/18 medium. `overline` cho tiêu đề nhóm (Sidebar, menu). */
const labelVariants = cva(
  "inline-flex items-center gap-2 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-45 group-data-[disabled=true]:opacity-45",
  {
    variants: {
      variant: {
        default: "text-[13px] leading-[18px] font-medium text-foreground",
        overline: "text-[11px] leading-4 font-semibold tracking-[.06em] text-muted-foreground uppercase",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Label({ className, variant, ...props }: React.ComponentProps<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>) {
  return <LabelPrimitive.Root data-slot="label" className={cn(labelVariants({ variant }), className)} {...props} />;
}

export { Label, labelVariants };
