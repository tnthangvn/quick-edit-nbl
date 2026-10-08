"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/ui/utils";
import { IconButton } from "@/ui/primitives/button";

/**
 * Dialog (SettingsDialog.md): bo `radius-xl`, `shadow-dialog`, nền `popover`, căn giữa màn hình.
 * Hiện như dropdown nhưng 220ms; đóng thì ẩn ngay.
 * `height="settings" | "wizard"`: chiều cao cố định (640 / 660px, tối đa 100vh − 48px). Header, thanh tab/stepper
 * và footer đứng yên, chỉ `DialogBody` cuộn (`scrollbar-gutter: stable`), đổi tab không làm dialog co giãn.
 */
const dialogContentVariants = cva(
  "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-48px)] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-dialog outline-none data-[state=open]:animate-[pop-in_var(--duration-slow)_var(--ease-out)]",
  {
    variants: {
      size: { sm: "w-[400px]", md: "w-[560px]", lg: "w-[860px]" },
      height: {
        auto: "",
        settings: "h-[min(640px,calc(100vh-48px))]",
        wizard: "h-[min(660px,calc(100vh-48px))]",
      },
    },
    defaultVariants: { size: "md", height: "auto" },
  },
);

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** Lớp phủ: gray-900 45% như wireframe (chưa có token riêng cho overlay). */
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--color-foreground)_45%,transparent)] data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-[color-mix(in_srgb,var(--color-background)_70%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants> & {
    /** Nút X ở góc phải header. Tắt khi header tự đặt nút đóng. */
    showCloseButton?: boolean;
  };

function DialogContent({ className, children, size, height, showCloseButton = true, ...props }: DialogContentProps) {
  const t = useTranslations("common.actions");
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ size, height }), className)}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close asChild>
            <IconButton icon={X} label={t("close")} tooltip={false} className="absolute top-3 right-3" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex shrink-0 flex-col gap-1 pt-4 pr-14 pb-2 pl-6", className)} {...props} />;
}

/** Vùng nội dung: thứ duy nhất cuộn trong dialog chiều cao cố định. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6 [scrollbar-gutter:stable]", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex shrink-0 items-center gap-2 border-t border-border bg-muted py-3 pr-4 pl-6", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("m-0 text-lg leading-6 font-semibold tracking-[-.01em]", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-[13px] leading-[18px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogContentVariants,
};
