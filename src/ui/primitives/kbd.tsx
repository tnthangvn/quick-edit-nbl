import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/** Phím tắt `font-mono` 11px. Mỗi phím một Kbd: `⌘` + `Enter` (macOS), `Ctrl` + `Enter` (Windows/Linux). */
const kbdVariants = cva(
  "pointer-events-none inline-block min-w-[18px] rounded-sm border border-b-2 border-border px-1 text-center font-mono text-[11px] leading-4 font-medium text-muted-foreground select-none",
  {
    variants: {
      surface: { card: "bg-card", muted: "bg-muted", inverse: "border-background/30 bg-transparent text-background" },
    },
    defaultVariants: { surface: "card" },
  },
);

function Kbd({ className, surface, ...props }: React.ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>) {
  return <kbd data-slot="kbd" className={cn(kbdVariants({ surface }), className)} {...props} />;
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="kbd-group" className={cn("inline-flex items-center gap-[3px]", className)} {...props} />;
}

export { Kbd, KbdGroup, kbdVariants };
