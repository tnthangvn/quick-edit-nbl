"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/** Switch.md: tắt = nền `muted` viền `input`, núm `muted-foreground`; bật = `primary`. Núm trượt 150ms. Luôn có nhãn (Field inline hoặc `aria-label`). */
const switchVariants = cva(
  "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-input bg-muted transition-[background-color,border-color] duration-(--duration-base) ease-out disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
  {
    variants: {
      size: { md: "h-5 w-9", sm: "h-4 w-7" },
    },
    defaultVariants: { size: "md" },
  },
);

const thumbVariants = cva(
  "pointer-events-none absolute top-[2px] left-[2px] rounded-full bg-muted-foreground transition-[left,background-color] duration-(--duration-base) ease-out group-data-[state=checked]/switch:bg-primary-foreground",
  {
    variants: {
      size: {
        md: "size-3.5 group-data-[state=checked]/switch:left-[18px]",
        sm: "size-2.5 group-data-[state=checked]/switch:left-[14px]",
      },
    },
    defaultVariants: { size: "md" },
  },
);

function Switch({ className, size, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root> & VariantProps<typeof switchVariants>) {
  return (
    <SwitchPrimitive.Root data-slot="switch" className={cn(switchVariants({ size }), className)} {...props}>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={thumbVariants({ size })} />
    </SwitchPrimitive.Root>
  );
}

export { Switch, switchVariants };
