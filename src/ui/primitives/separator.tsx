"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Separator as SeparatorPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/** Đường chia mảnh `color-border` (trang trí). */
const separatorVariants = cva("shrink-0 bg-border", {
  variants: {
    orientation: { horizontal: "h-px w-full", vertical: "w-px self-stretch" },
  },
  defaultVariants: { orientation: "horizontal" },
});

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & VariantProps<typeof separatorVariants>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation ?? "horizontal"}
      className={cn(separatorVariants({ orientation }), className)}
      {...props}
    />
  );
}

export { Separator, separatorVariants };
