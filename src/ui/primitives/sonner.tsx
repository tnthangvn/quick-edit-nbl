"use client";

import * as React from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, type ExternalToast, type ToasterProps } from "sonner";
import { Spinner } from "@/ui/primitives/spinner";

/**
 * Toast.md — sonner, không dùng style mặc định (`unstyled`), gán class theo token:
 * info = blue (`info` / `info-soft` / `info-border`), warning = amber, error = đỏ.
 * Tiêu đề + icon mang màu của loại, mô tả `muted-foreground`. Rộng 360px, `radius-lg`, `shadow-popover`, trượt vào 16px từ phải.
 * Tối đa 3 toast, khe `space-2`.
 */
function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-right"
      visibleToasts={3}
      gap={8}
      expand
      duration={4000}
      icons={{
        info: <Info aria-hidden />,
        success: <CircleCheck aria-hidden />,
        warning: <TriangleAlert aria-hidden />,
        error: <CircleAlert aria-hidden />,
        loading: <Spinner />,
        close: <X className="size-4" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group/toast flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-lg border py-3 pr-2 pl-4 text-foreground shadow-popover",
          icon: "mt-0.5 flex size-4 shrink-0 items-center [&_svg]:size-4",
          content: "flex min-w-0 flex-1 flex-col",
          title: "text-[13px] leading-5 font-semibold",
          description: "mt-0.5 text-[13px] leading-[18px] text-muted-foreground [&_code]:font-mono [&_code]:text-xs",
          actionButton:
            "order-9 h-7 shrink-0 cursor-pointer rounded-md border-0 bg-transparent px-2 text-[13px] font-semibold transition-colors duration-(--duration-base) ease-out hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]",
          cancelButton: "order-9 h-7 border-0 bg-transparent shrink-0 cursor-pointer rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-accent",
          closeButton:
            "order-10 -mt-0.5 inline-grid size-7 border-0 bg-transparent shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-(--duration-base) ease-out hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] hover:text-foreground",
          default: "border-border bg-popover",
          info: "border-info-border bg-info-soft [&_[data-button]]:text-info [&_[data-icon]]:text-info [&_[data-title]]:text-info",
          success: "border-info-border bg-info-soft [&_[data-button]]:text-info [&_[data-icon]]:text-info [&_[data-title]]:text-info",
          loading: "border-info-border bg-info-soft [&_[data-icon]]:text-info [&_[data-title]]:text-info",
          warning: "border-warning-border bg-warning-soft [&_[data-button]]:text-warning [&_[data-icon]]:text-warning [&_[data-title]]:text-warning",
          error: "border-error-border bg-error-soft [&_[data-button]]:text-error [&_[data-icon]]:text-error [&_[data-title]]:text-error",
        },
      }}
      {...props}
    />
  );
}

type NotifyOptions = Pick<ExternalToast, "id" | "description" | "toasterId" | "onDismiss"> & {
  action?: { label: React.ReactNode; onClick: () => void };
  /** info: đổi icon thành spinner (tiến trình). */
  loading?: boolean;
};

const toAction = (action: NotifyOptions["action"]) => (action ? { label: action.label, onClick: () => action.onClick() } : undefined);

/**
 * Gọi toast đúng thời lượng Toast.md: info 4s; warning 6s (có `action` thì giữ tới khi xử lý); error không tự ẩn, luôn có nút đóng.
 * Tiêu đề ngắn tiếng Việt, không chấm cuối; mô tả một câu nêu nguyên nhân + cách xử lý.
 */
const notify = {
  info: (title: React.ReactNode, { action, loading, ...opts }: NotifyOptions = {}) =>
    toast.info(title, { ...opts, action: toAction(action), duration: loading ? Infinity : 4000, icon: loading ? <Spinner /> : undefined }),
  warning: (title: React.ReactNode, { action, ...opts }: NotifyOptions = {}) =>
    toast.warning(title, { ...opts, action: toAction(action), duration: action ? Infinity : 6000, closeButton: Boolean(action) }),
  error: (title: React.ReactNode, { action, ...opts }: NotifyOptions = {}) =>
    toast.error(title, { ...opts, action: toAction(action), duration: Infinity, closeButton: true }),
  dismiss: (id?: string | number) => toast.dismiss(id),
};

export { Toaster, notify, type NotifyOptions };
