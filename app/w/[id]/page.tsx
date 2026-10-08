import { Suspense } from "react";
import { WorkbenchScreen } from "./workbench-screen";
import WorkbenchLoading from "./loading";

/** Workbench của một Workspace (spec 3.1–3.4). Params là async (cacheComponents): đọc trong Suspense. */
export default function WorkbenchPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<WorkbenchLoading />}>
      <WorkbenchRoute params={params} />
    </Suspense>
  );
}

async function WorkbenchRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkbenchScreen workspaceId={id} />;
}
