"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";

/**
 * Tabs.md: `line` (mặc định) — gạch chân 2px `primary` dưới tab đang chọn (3 tab Settings);
 * `pill` — lựa chọn ngắn (Sync Strategy, lọc Local/Git/Drive).
 */
type TabsVariant = "line" | "pill";
const TabsVariantContext = React.createContext<TabsVariant>("line");

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />;
}

const tabsListVariants = cva("shrink-0", {
  variants: {
    variant: {
      line: "flex gap-4 border-b border-border",
      pill: "inline-flex w-fit gap-0.5 rounded-md border border-border bg-muted p-0.5",
    },
  },
  defaultVariants: { variant: "line" },
});

function TabsList({ className, variant, ...props }: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  const v = variant ?? "line";
  return (
    <TabsVariantContext.Provider value={v}>
      <TabsPrimitive.List data-slot="tabs-list" data-variant={v} className={cn(tabsListVariants({ variant: v }), className)} {...props} />
    </TabsVariantContext.Provider>
  );
}

const tabsTriggerVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,border-color,box-shadow] duration-(--duration-fast) ease-out not-disabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45 data-[state=active]:text-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        line: "-mb-px h-10 border-b-2 border-transparent data-[state=active]:border-primary",
        pill: "h-[26px] rounded-sm px-3 data-[state=active]:bg-card data-[state=active]:shadow-[0_0_0_1px_var(--color-border)]",
      },
    },
    defaultVariants: { variant: "line" },
  },
);

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext);
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(tabsTriggerVariants({ variant }), className)} {...props} />;
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("min-h-0 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants, tabsTriggerVariants };
