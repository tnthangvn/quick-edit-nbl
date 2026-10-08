"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/ui/utils";
import { menuItemVariants, menuSeparatorClass, menuShortcutClass } from "@/ui/primitives/surface";

/** Danh sách có tìm kiếm (cmdk) — nền cho Combobox và command palette. Bề mặt nổi do Popover/Dialog bọc ngoài lo. */
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn("flex size-full flex-col overflow-hidden bg-popover text-popover-foreground outline-none", className)}
      {...props}
    />
  );
}

/** Ô tìm ở đầu popover: cao 36px, icon `search`, viền dưới; `trailing` (vd đếm `kết quả/tổng`) ở bên phải. */
function CommandInput({ className, trailing, mono, ...props }: React.ComponentProps<typeof CommandPrimitive.Input> & { trailing?: React.ReactNode; mono?: boolean }) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-muted-foreground in-data-[side=top]:border-t in-data-[side=top]:border-b-0">
      <Search className="size-3.5 shrink-0" aria-hidden />
      <CommandPrimitive.Input
        data-slot="command-input"
        data-mono={mono || undefined}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed data-mono:font-mono data-mono:text-xs data-mono:placeholder:font-sans data-mono:placeholder:text-[13px]",
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List data-slot="command-list" className={cn("max-h-[280px] scroll-py-1 overflow-x-hidden overflow-y-auto p-1 outline-none", className)} {...props} />;
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className={cn("px-3 py-4 text-center text-xs text-muted-foreground", className)} {...props} />;
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return <CommandPrimitive.Group data-slot="command-group" className={cn(
        "**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-[.06em] **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:uppercase",
        className,
      )} {...props} />;
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn(menuSeparatorClass, className)} {...props} />;
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item data-slot="command-item" className={cn(menuItemVariants(), className)} {...props} />;
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn(menuShortcutClass, className)} {...props} />;
}

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut };
