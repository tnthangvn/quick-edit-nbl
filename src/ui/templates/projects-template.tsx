import * as React from "react";
import { cn } from "@/ui/utils";

/**
 * Màn Projects (spec 3.0): Header, tiêu đề + hành động (New Project, Mở thư mục có sẵn), thanh công cụ (tìm, lọc, sắp xếp),
 * vùng danh sách. Chỉ lo bố cục và slot.
 */
type ProjectsTemplateProps = {
  header: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function ProjectsTemplate({ header, title, description, actions, toolbar, children, className }: ProjectsTemplateProps) {
  return (
    <div data-slot="projects" className={cn("grid h-full min-h-0 grid-rows-[var(--size-header)_minmax(0,1fr)] bg-background", className)}>
      {header}
      <main className="min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto flex w-full max-w-[1344px] flex-col gap-6 px-6 py-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="m-0 text-lg leading-6 font-semibold tracking-[-.01em]">{title}</h1>
              {description ? <p className="m-0 mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{description}</p> : null}
            </div>
            {actions}
          </div>
          {toolbar ? <div className="flex flex-wrap items-center gap-3">{toolbar}</div> : null}
          {children}
        </div>
      </main>
    </div>
  );
}

/** Lưới thẻ Workspace: 3 cột trên màn rộng, khe 16px. */
function ProjectsGrid({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3", className)} {...props} />;
}

export { ProjectsGrid, ProjectsTemplate, type ProjectsTemplateProps };
