import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/utils";

/**
 * Workbench.md: grid cột `size-sidebar` (thu gọn `size-sidebar-collapsed`) + 1fr, hàng `size-header` + 1fr.
 * Cột phải: Workspace (Editor / DiffEditor) chiếm phần còn lại, bên dưới là log chat, Quick Setting Toolbar, Composer.
 * Chỉ lo bố cục và slot.
 */
const workbenchVariants = cva(
  "relative grid h-full min-h-0 grid-rows-[var(--size-header)_minmax(0,1fr)] overflow-hidden bg-background transition-[grid-template-columns] duration-(--duration-slow) ease-out",
  {
    variants: {
      collapsed: {
        false: "grid-cols-[var(--size-sidebar)_minmax(0,1fr)]",
        true: "grid-cols-[var(--size-sidebar-collapsed)_minmax(0,1fr)]",
      },
    },
    defaultVariants: { collapsed: false },
  },
);

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
  className?: string;
};

function WorkbenchTemplate({ header, sidebar, editor, chatLog, toolbar, composer, overlay, collapsed, className }: WorkbenchTemplateProps) {
  return (
    <div data-slot="workbench" data-collapsed={collapsed || undefined} className={cn(workbenchVariants({ collapsed }), className)}>
      <div className="col-span-full min-w-0">{header}</div>
      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-sidebar">{sidebar}</aside>
      <main className="flex min-h-0 min-w-0 flex-col gap-3 px-4 pt-3 pb-4">
        <section className="flex min-h-0 flex-1 flex-col">{editor}</section>
        {chatLog || toolbar || composer ? (
          <section className="flex shrink-0 flex-col">
            {chatLog ? <div className="flex max-h-[180px] flex-col gap-2 overflow-auto pb-1">{chatLog}</div> : null}
            {toolbar ? <div className="flex items-center gap-2 py-2">{toolbar}</div> : null}
            {composer}
          </section>
        ) : null}
      </main>
      {overlay ? <div className="pointer-events-none absolute right-6 bottom-6 z-30 *:pointer-events-auto">{overlay}</div> : null}
    </div>
  );
}

export { WorkbenchTemplate, workbenchVariants, type WorkbenchTemplateProps };
