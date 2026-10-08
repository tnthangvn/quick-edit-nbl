"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";
import { surfaceVariants } from "@/ui/primitives/surface";

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor(props: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

/** Bề mặt nổi chung (`surfaceVariants`): mặc định đệm `md`; Combobox dùng `padding="none"`. */
function PopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  padding = "md",
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & { padding?: "none" | "menu" | "md" }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(surfaceVariants({ padding }), className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
