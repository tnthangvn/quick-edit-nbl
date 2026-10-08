import { WorkbenchTemplate } from "@/ui/templates/workbench-template";
import { Skeleton } from "@/ui/primitives/skeleton";

/** Khung Workbench khi đang tải route: cùng bố cục, chỗ giữ chỗ `muted`. */
export default function WorkbenchLoading() {
  return (
    <div className="h-dvh">
      <WorkbenchTemplate
        header={<div className="h-full border-b border-border bg-sidebar" />}
        sidebar={
          <div className="flex flex-col gap-1 p-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} shape="row" />
            ))}
          </div>
        }
        editor={<Skeleton shape="block" className="flex-1" />}
      />
    </div>
  );
}
