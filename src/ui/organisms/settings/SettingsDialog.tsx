"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FileCog } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormProvider, useForm, useWatch, type FieldErrors, type FieldValues, type UseFormReturn } from "react-hook-form";
import {
  getGetSettingsQueryKey,
  getGetWorkspaceConfigQueryKey,
  getGetWorkspaceQueryKey,
  getListWorkspaceSecretsQueryKey,
  getListWorkspacesQueryKey,
  useGetSettings,
  useGetWorkspace,
  useGetWorkspaceConfig,
  useListWorkspaceSecrets,
  useSetWorkspaceSecret,
  useUpdateSettings,
  useUpdateWorkspaceConfig,
} from "@/client/api/generated";
import type { AgentSettingsView, WorkspaceConfigOutput, WorkspaceSecretKind } from "@/client/api/generated/model";
import { UpdateSettingsBody, UpdateWorkspaceConfigBody } from "@/client/api/generated/zod/setting/setting.zod";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { EmptyState } from "@/ui/molecules/empty-state";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Icon } from "@/ui/primitives/icon";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import { ConnectorManager } from "@/ui/organisms/connectors/ConnectorManager";
import { RemoveWorkspaceDialog } from "@/ui/organisms/projects/WorkspaceDialogs";
import { apiErrorMap, applyServerFieldErrors } from "@/ui/organisms/settings/form-errors";
import { ApiTab, type SettingsForm } from "@/ui/organisms/settings/tabs/ApiTab";
import { CliTab } from "@/ui/organisms/settings/tabs/CliTab";
import { ExportImportTab } from "@/ui/organisms/settings/tabs/ExportImportTab";
import { NotebookTab, type ConfigForm, type NotebookSecrets } from "@/ui/organisms/settings/tabs/NotebookTab";
import { WorkspaceTab } from "@/ui/organisms/settings/tabs/WorkspaceTab";

export type SettingsTab = "API" | "CLI" | "NOTEBOOK" | "WORKSPACE" | "INTEGRATIONS" | "EXPORT_IMPORT";

export type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có: hiện thêm tab NOTEBOOK, WORKSPACE (cấu hình của Workspace đang mở). */
  workspaceId?: string;
  initialTab?: SettingsTab;
};

const GLOBAL_TABS: SettingsTab[] = ["API", "CLI", "INTEGRATIONS", "EXPORT_IMPORT"];
const ALL_TABS: SettingsTab[] = ["API", "CLI", "NOTEBOOK", "WORKSPACE", "INTEGRATIONS", "EXPORT_IMPORT"];

function toSettingsForm(view: AgentSettingsView): SettingsForm {
  return {
    activeMode: view.activeMode,
    api: { provider: view.api.provider, model: view.api.model, baseUrl: view.api.baseUrl, temperature: view.api.temperature, systemPrompt: view.api.systemPrompt },
    cli: {
      activeProfileId: view.cli.activeProfileId,
      streamStdout: view.cli.streamStdout,
      permissionMode: view.cli.permissionMode,
      profiles: view.cli.profiles,
    },
  };
}

function toConfigForm(cfg: WorkspaceConfigOutput): ConfigForm {
  return { version: 1, workspace: cfg.workspace, storage: cfg.storage, nbl: cfg.nbl, ...(cfg.agent ? { agent: cfg.agent } : {}) };
}

/** Chạy validate (resolver zod) và trả dữ liệu đã parse, hoặc `null` nếu lỗi. */
function validated<T extends FieldValues, O>(form: UseFormReturn<T, unknown, O>): Promise<O | null> {
  return new Promise((resolve) => {
    void form.handleSubmit(
      (data) => resolve(data),
      () => resolve(null),
    )();
  });
}

const settingsTabOf = (errors: FieldErrors<SettingsForm>): SettingsTab => (errors.api ? "API" : "CLI");
const configTabOf = (errors: FieldErrors<ConfigForm>): SettingsTab => (errors.nbl ? "NOTEBOOK" : "WORKSPACE");

function TabState({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center py-10">{children}</div>;
}

/**
 * Settings Dialog (spec 4, SettingsDialog.md): cao cố định 640px, thanh tab đứng yên, chỉ thân cuộn; footer hiện nơi lưu
 * + Cancel / Save. Tab 1, 2, 5 là cấu hình chung; tab 3, 4 thuộc Workspace (`workspaceId`).
 * Save: PUT `/api/settings` (nếu tab 1–2 đổi), PUT `/api/workspaces/{id}/config` (tab 3–4), ghi secret NotebookLM chỉ ghi.
 * Tab 5 (Integrations) thao tác trực tiếp từng connector, không chờ Save.
 */
export function SettingsDialog({ open, onOpenChange, workspaceId, initialTab }: SettingsDialogProps) {
  const [saving, setSaving] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent size="lg" height="settings">
        {/* Nội dung chỉ mount khi mở: tab, secret và form khởi tạo lại mỗi lần mở. */}
        <SettingsPanel onOpenChange={onOpenChange} workspaceId={workspaceId} initialTab={initialTab} saving={saving} setSaving={setSaving} />
      </DialogContent>
    </Dialog>
  );
}

type SettingsPanelProps = Omit<SettingsDialogProps, "open"> & { saving: boolean; setSaving: (saving: boolean) => void };

function SettingsPanel({ onOpenChange, workspaceId, initialTab, saving, setSaving }: SettingsPanelProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const tabs = workspaceId ? ALL_TABS : GLOBAL_TABS;
  const [tab, setTab] = React.useState<SettingsTab>(initialTab && tabs.includes(initialTab) ? initialTab : "API");
  const [secrets, setSecrets] = React.useState<NotebookSecrets>({});
  const [removeOpen, setRemoveOpen] = React.useState(false);

  const wsId = workspaceId ?? "";
  const hasWs = Boolean(workspaceId);
  const settingsQ = useGetSettings();
  const workspaceQ = useGetWorkspace(wsId, { query: { enabled: hasWs } });
  const configQ = useGetWorkspaceConfig(wsId, { query: { enabled: hasWs, retry: false } });
  const secretsQ = useListWorkspaceSecrets(wsId, { query: { enabled: hasWs } });

  const settingsForm = useForm<SettingsForm, unknown>({ resolver: zodResolver(UpdateSettingsBody, apiErrorMap) });
  const configForm = useForm<ConfigForm, unknown>({ resolver: zodResolver(UpdateWorkspaceConfigBody, apiErrorMap) });
  const updateSettings = useUpdateSettings();
  const updateConfig = useUpdateWorkspaceConfig();
  const setSecret = useSetWorkspaceSecret();

  // Nạp form từ dữ liệu server (lần đầu và khi query trả bản mới mà người dùng chưa sửa gì).
  const loaded = React.useRef<{ settings: unknown; config: unknown }>({ settings: null, config: null });
  React.useEffect(() => {
    if (settingsQ.data && loaded.current.settings !== settingsQ.data && !settingsForm.formState.isDirty) {
      loaded.current.settings = settingsQ.data;
      settingsForm.reset(toSettingsForm(settingsQ.data));
    }
  }, [settingsQ.data, settingsForm]);
  React.useEffect(() => {
    if (configQ.data && loaded.current.config !== configQ.data && !configForm.formState.isDirty) {
      loaded.current.config = configQ.data;
      configForm.reset(toConfigForm(configQ.data));
    }
  }, [configQ.data, configForm]);

  // Form chỉ hiện sau khi đã nạp giá trị server (tránh control đổi từ uncontrolled sang controlled).
  const settingsReady = useWatch({ control: settingsForm.control, name: "activeMode" }) !== undefined;
  const configReady = useWatch({ control: configForm.control, name: "version" }) !== undefined;

  const secretSet = Object.fromEntries((secretsQ.data?.items ?? []).map((s) => [s.kind, s.isSet])) as Partial<Record<WorkspaceSecretKind, boolean>>;

  const save = async () => {
    const settingsDirty = Boolean(settingsQ.data) && settingsForm.formState.isDirty;
    const configDirty = Boolean(configQ.data) && configForm.formState.isDirty;
    const secretEntries = (Object.entries(secrets) as [WorkspaceSecretKind, string][]).filter(([, v]) => v.trim());
    if (!settingsDirty && !configDirty && secretEntries.length === 0) {
      onOpenChange(false);
      return;
    }

    const sData = settingsDirty ? await validated(settingsForm) : null;
    if (settingsDirty && !sData) {
      setTab(settingsTabOf(settingsForm.formState.errors));
      return;
    }
    const cData = configDirty ? await validated(configForm) : null;
    if (configDirty && !cData) {
      setTab(configTabOf(configForm.formState.errors));
      return;
    }

    setSaving(true);
    const failures: { scope: "settings" | "config" | "secret"; err: unknown }[] = [];
    await Promise.all([
      sData ? updateSettings.mutateAsync({ data: sData }).catch((err) => failures.push({ scope: "settings", err })) : null,
      cData && workspaceId ? updateConfig.mutateAsync({ workspaceId, data: cData }).catch((err) => failures.push({ scope: "config", err })) : null,
      ...secretEntries.map(([kind, value]) =>
        workspaceId ? setSecret.mutateAsync({ workspaceId, kind, data: { value: value.trim() } }).catch((err) => failures.push({ scope: "secret", err })) : null,
      ),
    ]);
    setSaving(false);

    void queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    if (workspaceId) {
      void queryClient.invalidateQueries({ queryKey: getGetWorkspaceConfigQueryKey(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: getListWorkspaceSecretsQueryKey(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
    }

    if (failures.length === 0) {
      notify.info(t("saved"));
      onOpenChange(false);
      return;
    }
    for (const { scope, err } of failures) {
      if (scope === "settings" && applyServerFieldErrors(err, settingsForm.setError)) {
        setTab(settingsTabOf(settingsForm.formState.errors));
        continue;
      }
      if (scope === "config" && applyServerFieldErrors(err, configForm.setError)) {
        setTab(configTabOf(configForm.formState.errors));
        continue;
      }
      if (scope === "secret") setTab("NOTEBOOK");
      notify.error(t(`saveFailed.${scope}`), { description: errorMessage(err) });
    }
  };

  const settingsBody = (content: React.ReactNode) =>
    settingsQ.isPending || (settingsQ.isSuccess && !settingsReady) ? (
      <TabState>
        <Spinner tone="muted" label={t("loading")} />
      </TabState>
    ) : settingsQ.isError ? (
      <EmptyState
        icon={CircleAlert}
        title={t("loadFailed")}
        description={errorMessage(settingsQ.error)}
        actions={
          <Button variant="outline" size="sm" onClick={() => void settingsQ.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    ) : (
      <FormProvider {...settingsForm}>{content}</FormProvider>
    );

  const configBody = (content: React.ReactNode) =>
    configQ.isPending || (configQ.isSuccess && !configReady) ? (
      <TabState>
        <Spinner tone="muted" label={t("loading")} />
      </TabState>
    ) : configQ.isError ? (
      <EmptyState
        icon={FileCog}
        title={t("configMissingTitle")}
        description={errorMessage(configQ.error)}
        actions={
          <Button variant="outline" size="sm" onClick={() => void configQ.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    ) : (
      <FormProvider {...configForm}>{content}</FormProvider>
    );

  const workspaceTab = tab === "NOTEBOOK" || tab === "WORKSPACE";
  const configPath = workspaceTab && workspaceQ.data ? `${workspaceQ.data.path.replace(/\/$/, "")}/.spec-studio/config.json` : t("globalPath");

  return (
    <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsTab)} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="pb-0">
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{workspaceQ.data ? t("descriptionWorkspace", { name: workspaceQ.data.name }) : t("description")}</DialogDescription>
              <TabsList aria-label={t("title")} className="mt-2 -mr-8">
                {tabs.map((id) => (
                  <TabsTrigger key={id} value={id}>
                    {t(`tabs.${id}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </DialogHeader>
            <DialogBody>
              <TabsContent value="API" className="flex flex-col gap-5">
                {settingsBody(<ApiTab hasApiKey={settingsQ.data?.api.hasApiKey ?? false} savedProvider={settingsQ.data?.api.provider} workspaceId={workspaceId} />)}
              </TabsContent>
              <TabsContent value="CLI" className="flex flex-col gap-5">
                {settingsBody(<CliTab workspacePath={workspaceQ.data?.path} />)}
              </TabsContent>
              {workspaceId ? (
                <>
                  <TabsContent value="NOTEBOOK" className="flex flex-col gap-5">
                    {configBody(<NotebookTab workspaceId={workspaceId} secrets={secrets} onSecretsChange={setSecrets} secretSet={secretSet} />)}
                  </TabsContent>
                  <TabsContent value="WORKSPACE" className="flex flex-col gap-5">
                    {configBody(<WorkspaceTab workspace={workspaceQ.data} onRemove={() => setRemoveOpen(true)} />)}
                  </TabsContent>
                </>
              ) : null}
              <TabsContent value="INTEGRATIONS" className="flex flex-col gap-5">
                <ConnectorManager />
              </TabsContent>
              <TabsContent value="EXPORT_IMPORT" className="flex flex-col gap-5">
                <ExportImportTab />
              </TabsContent>
            </DialogBody>
          </Tabs>
          <DialogFooter>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
              <Icon icon={FileCog} size="sm" />
              <code className="truncate font-mono text-[11px]" title={configPath}>
                {configPath}
              </code>
            </span>
            <Button variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button variant="primary" loading={saving} loadingText={tc("saving")} onClick={() => void save()}>
              {tc("save")}
            </Button>
          </DialogFooter>
      {workspaceId ? (
        <RemoveWorkspaceDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          workspace={workspaceQ.data ?? null}
          onRemoved={() => {
            onOpenChange(false);
            if (pathname !== "/") router.push("/");
          }}
        />
      ) : null}
    </>
  );
}
