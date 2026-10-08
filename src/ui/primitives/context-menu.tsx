"use client";

import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";
import { menuItemVariants, menuLabelClass, menuSeparatorClass, menuShortcutClass, surfaceVariants } from "@/ui/primitives/surface";

/** Menu chuột phải — cùng bề mặt và item với DropdownMenu (`surface.ts`). */
function ContextMenu(props: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger(props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuGroup(props: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(surfaceVariants(), "max-h-(--radix-context-menu-content-available-height) min-w-[220px] overflow-y-auto", className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset,
  tone,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & { inset?: boolean; tone?: "default" | "destructive" }) {
  return <ContextMenuPrimitive.Item data-slot="context-menu-item" data-tone={tone} className={cn(menuItemVariants({ tone, inset }), className)} {...props} />;
}

function ContextMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem data-slot="context-menu-checkbox-item" className={cn(menuItemVariants({ inset: true }), className)} {...props}>
      <span className="pointer-events-none absolute left-2 inline-grid size-4 place-items-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="text-primary!" aria-hidden />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuLabel({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return <ContextMenuPrimitive.Label data-slot="context-menu-label" className={cn(menuLabelClass, className)} {...props} />;
}

function ContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" className={cn(menuSeparatorClass, className)} {...props} />;
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="context-menu-shortcut" className={cn(menuShortcutClass, className)} {...props} />;
}

function ContextMenuSub(props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

function ContextMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger data-slot="context-menu-sub-trigger" className={cn(menuItemVariants(), "data-[state=open]:bg-accent", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" aria-hidden />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent data-slot="context-menu-sub-content" className={cn(surfaceVariants(), "min-w-[180px]", className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
