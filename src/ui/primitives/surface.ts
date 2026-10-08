import { cva } from "class-variance-authority";

/**
 * Lớp bề mặt nổi dùng chung cho Popover, DropdownMenu, ContextMenu, Select, Combobox.
 * Xuất hiện: mờ + trượt 4px + scale(.98) (pop-in / pop-up khi mở lên trên). Biến mất: ẩn ngay.
 */
export const surfaceVariants = cva(
  "z-50 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-popover outline-none data-[state=open]:animate-pop-in data-[side=top]:data-[state=open]:animate-pop-up",
  {
    variants: {
      padding: { none: "", menu: "p-1", md: "p-3" },
    },
    defaultVariants: { padding: "menu" },
  },
);

/** Một dòng trong menu / danh sách chọn: cao `size-row`, hover/được trỏ = `color-accent`. */
export const menuItemVariants = cva(
  "relative flex min-h-(--size-row) cursor-pointer items-center gap-2 rounded-md px-2 text-[13px] leading-[18px] outline-none select-none transition-colors duration-(--duration-fast) ease-out data-highlighted:bg-accent data-[selected=true]:bg-accent data-disabled:pointer-events-none data-disabled:opacity-45 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      tone: {
        default: "text-popover-foreground [&_svg]:text-muted-foreground",
        destructive: "text-destructive data-highlighted:bg-destructive-soft [&_svg]:text-destructive",
      },
      inset: { true: "pl-8", false: "" },
    },
    defaultVariants: { tone: "default", inset: false },
  },
);

/** Tiêu đề nhóm trong menu: overline 11/16 viết HOA. */
export const menuLabelClass =
  "px-2 pt-2 pb-1 text-[11px] leading-4 font-semibold tracking-[.06em] text-muted-foreground uppercase";

export const menuSeparatorClass = "-mx-1 my-1 h-px bg-border";

export const menuShortcutClass = "ml-auto font-mono text-[11px] text-muted-foreground";
