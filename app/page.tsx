"use client";

import * as React from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WorkspaceSort } from "@/client/api/generated/model";
import { ProjectList, ProjectsSummary } from "@/ui/organisms/projects/ProjectList";
import { ProjectsHeader } from "@/ui/organisms/projects/ProjectsHeader";
import { ProjectToolbar, type StorageFilter } from "@/ui/organisms/projects/ProjectToolbar";
import { ImportWorkspaceDialog } from "@/ui/organisms/projects/WorkspaceDialogs";
import { SettingsDialog, type SettingsTab } from "@/ui/organisms/settings/SettingsDialog";
import { NewProjectDialog } from "@/ui/organisms/wizard/NewProjectDialog";
import { Button } from "@/ui/primitives/button";
import { ProjectsGrid, ProjectsTemplate } from "@/ui/templates/projects-template";

type SettingsState = { open: boolean; workspaceId?: string; tab?: SettingsTab };

/** Màn hình Projects (spec 3.0) — route `/`. Bộ lọc là state cục bộ; dữ liệu do organism tải. */
export default function ProjectsPage() {
  const t = useTranslations("projects");
  const [q, setQ] = React.useState("");
  const [storage, setStorage] = React.useState<StorageFilter>("ALL");
  const [sort, setSort] = React.useState<WorkspaceSort>("RECENT");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<SettingsState>({ open: false });

  const openWizard = () => setWizardOpen(true);
  const openImport = () => setImportOpen(true);

  return (
    <>
      <ProjectsTemplate
        header={<ProjectsHeader onOpenSettings={() => setSettings({ open: true, tab: "API" })} />}
        title={t("title")}
        description={<ProjectsSummary />}
        actions={
          <>
            <Button variant="outline" icon={FolderOpen} onClick={openImport}>
              {t("actions.importExisting")}
            </Button>
            <Button variant="primary" icon={Plus} onClick={openWizard}>
              {t("actions.newProject")}
            </Button>
          </>
        }
        toolbar={<ProjectToolbar q={q} onQChange={setQ} storage={storage} onStorageChange={setStorage} sort={sort} onSortChange={setSort} />}
      >
        <ProjectList
          q={q}
          storage={storage}
          sort={sort}
          onNewProject={openWizard}
          onImport={openImport}
          onEditConfig={(workspaceId) => setSettings({ open: true, workspaceId, tab: "WORKSPACE" })}
          grid={(children) => <ProjectsGrid>{children}</ProjectsGrid>}
        />
      </ProjectsTemplate>
      <NewProjectDialog open={wizardOpen} onOpenChange={setWizardOpen} />
      <ImportWorkspaceDialog open={importOpen} onOpenChange={setImportOpen} />
      <SettingsDialog
        open={settings.open}
        onOpenChange={(open) => setSettings((s) => ({ ...s, open }))}
        workspaceId={settings.workspaceId}
        initialTab={settings.tab}
      />
    </>
  );
}
