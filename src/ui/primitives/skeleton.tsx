import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/** Khối giữ chỗ khi đang tải (nền `muted`, bo `radius-sm`), như `wf-sk` trong wireframe. Không nhấp nháy theo motion README. */
const skeletonVariants = cva("block shrink-0 bg-muted", {
  variants: {
    shape: { line: "h-3 rounded-sm", row: "h-(--size-row) rounded-md", block: "rounded-lg" },
  },
  defaultVariants: { shape: "line" },
});

function Skeleton({ className, shape, ...props }: React.ComponentProps<"span"> & VariantProps<typeof skeletonVariants>) {
  return <span data-slot="skeleton" aria-hidden className={cn(skeletonVariants({ shape }), className)} {...props} />;
}

export { Skeleton, skeletonVariants };
