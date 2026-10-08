import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ResizeHandle } from "@/ui/primitives/resize-handle";
import { cn } from "@/ui/utils";

/**
 * Workbench.md: grid cột `size-sidebar` (thu gọn `size-sidebar-collapsed`) + 1fr, hàng `size-header` + 1fr.
 * Khung chat (log chat, Quick Setting Toolbar, Composer) neo theo `chatDock`: BOTTOM = dưới Editor; LEFT / RIGHT = cột
 * `size-chat-panel` cao hết màn, cạnh sidebar hoặc sát phải, để Editor và log chat cùng hiện đủ. Chỉ lo bố cục và slot.
 */
const workbenchVariants = cva(
  "relative grid h-full min-h-0 grid-rows-[var(--size-header)_minmax(0,1fr)] overflow-hidden bg-background transition-[grid-template-columns] duration-(--duration-slow) ease-out has-[[data-slot=resize-handle][data-dragging]]:transition-none",
  {
    variants: {
      collapsed: { false: "", true: "" },
      chatDock: { BOTTOM: "", LEFT: "", RIGHT: "" },
    },
    compoundVariants: [
      { chatDock: "BOTTOM", collapsed: false, className: "grid-cols-[var(--size-sidebar)_minmax(0,1fr)]" },
      { chatDock: "BOTTOM", collapsed: true, className: "grid-cols-[var(--size-sidebar-collapsed)_minmax(0,1fr)]" },
      { chatDock: "LEFT", collapsed: false, className: "grid-cols-[var(--size-sidebar)_min(var(--size-chat-panel),50vw)_minmax(0,1fr)]" },
      { chatDock: "LEFT", collapsed: true, className: "grid-cols-[var(--size-sidebar-collapsed)_min(var(--size-chat-panel),50vw)_minmax(0,1fr)]" },
      { chatDock: "RIGHT", collapsed: false, className: "grid-cols-[var(--size-sidebar)_minmax(0,1fr)_min(var(--size-chat-panel),50vw)]" },
      { chatDock: "RIGHT", collapsed: true, className: "grid-cols-[var(--size-sidebar-collapsed)_minmax(0,1fr)_min(var(--size-chat-panel),50vw)]" },
    ],
    defaultVariants: { collapsed: false, chatDock: "BOTTOM" },
  },
);

const chatPanelVariants = cva("relative flex min-h-0 flex-col", {
  variants: {
    chatDock: {
      BOTTOM: "shrink-0",
      LEFT: "min-w-0 px-3 pt-3 pb-4",
      RIGHT: "min-w-0 px-3 pt-3 pb-4",
    },
  },
  defaultVariants: { chatDock: "BOTTOM" },
});

const chatLogVariants = cva("flex flex-col gap-2 overflow-auto pb-1", {
  variants: { chatDock: { BOTTOM: "max-h-[180px]", LEFT: "min-h-0 flex-1", RIGHT: "min-h-0 flex-1" } },
  defaultVariants: { chatDock: "BOTTOM" },
});

const chatToolbarVariants = cva("flex items-center gap-2 py-2", {
  variants: { chatDock: { BOTTOM: "", LEFT: "flex-wrap", RIGHT: "flex-wrap" } },
  defaultVariants: { chatDock: "BOTTOM" },
});

type WorkbenchTemplateProps = VariantProps<typeof workbenchVariants> & {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  /** Editor hoặc DiffEditor. */
  editor: React.ReactNode;
  chatLog?: React.ReactNode;
  toolbar?: React.ReactNode;
  composer?: React.ReactNode;
  /** Lớp nổi góc dưới phải (bảng Sync Activity). */
  overlay?: React.ReactNode;
  /** Chiều rộng cột chat khi neo trái / phải; có `onChatWidthChange` thì cạnh trong của cột kéo giãn được. */
  chatWidth?: { value: number; min: number; max: number; label: string };
  onChatWidthChange?: (width: number) => void;
  className?: string;
};

function WorkbenchTemplate({
  header,
  sidebar,
  editor,
  chatLog,
  toolbar,
  composer,
  overlay,
  collapsed,
  chatDock,
  chatWidth,
  onChatWidthChange,
  className,
}: WorkbenchTemplateProps) {
  const dock = chatDock ?? "BOTTOM";
  // Cạnh trong của cột chat (giáp Editor) là đường viền + thanh kéo.
  const edge =
    dock === "BOTTOM" ? null : chatWidth && onChatWidthChange ? (
      <ResizeHandle
        edge={dock === "LEFT" ? "end" : "start"}
        value={chatWidth.value}
        min={chatWidth.min}
        max={chatWidth.max}
        label={chatWidth.label}
        onValueChange={onChatWidthChange}
        className={cn("absolute inset-y-0", dock === "LEFT" ? "-right-1" : "-left-1")}
      />
    ) : (
      <span aria-hidden className={cn("absolute inset-y-0 w-px bg-border", dock === "LEFT" ? "right-0" : "left-0")} />
    );
  const chat =
    chatLog || toolbar || composer ? (
      <section data-slot="workbench-chat" className={chatPanelVariants({ chatDock: dock })}>
        {chatLog ? <div className={chatLogVariants({ chatDock: dock })}>{chatLog}</div> : null}
        {toolbar ? <div className={chatToolbarVariants({ chatDock: dock })}>{toolbar}</div> : null}
        {composer}
        {edge}
      </section>
    ) : null;
  const docked = dock !== "BOTTOM" && chat !== null;

  return (
    <div
      data-slot="workbench"
      data-collapsed={collapsed || undefined}
      data-chat-dock={dock}
      className={cn(workbenchVariants({ collapsed, chatDock: docked ? dock : "BOTTOM" }), className)}
      style={chatWidth ? ({ "--size-chat-panel": `${chatWidth.value}px` } as React.CSSProperties) : undefined}
    >
      <div className="col-span-full min-w-0">{header}</div>
      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-sidebar">{sidebar}</aside>
      {docked && dock === "LEFT" ? chat : null}
      <main className="flex min-h-0 min-w-0 flex-col gap-3 px-4 pt-3 pb-4">
        <section className="flex min-h-0 flex-1 flex-col">{editor}</section>
        {docked ? null : chat}
      </main>
      {docked && dock === "RIGHT" ? chat : null}
      {overlay ? <div className="pointer-events-none absolute right-6 bottom-6 z-30 *:pointer-events-auto">{overlay}</div> : null}
    </div>
  );
}

export { WorkbenchTemplate, workbenchVariants, type WorkbenchTemplateProps };
