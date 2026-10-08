"use client";

import * as React from "react";
import { FolderOpen, FolderPlus, MessageSquare, Plus, Search, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AgentMode, PublishStepStatus, SpecSyncStatus, Workspace } from "@/client/api/generated/model";
import { useUiStore } from "@/client/stores/ui-store";
import { cn } from "@/ui/utils";
import { Badge } from "@/ui/primitives/badge";
import { Button, IconButton } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/primitives/input-group";
import { Label } from "@/ui/primitives/label";
import { Switch } from "@/ui/primitives/switch";
import { Tabs, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import { ChatMessage } from "@/ui/molecules/chat-message";
import { Composer } from "@/ui/molecules/composer";
import { ConnectorRow } from "@/ui/molecules/connector-row";
import { EmptyState } from "@/ui/molecules/empty-state";
import { Field } from "@/ui/molecules/field";
import { ModeSwitch } from "@/ui/molecules/mode-switch";
import { NewProjectCard, ProjectCard } from "@/ui/molecules/project-card";
import { SpecListItem } from "@/ui/molecules/spec-list-item";
import { SyncChip, SyncTargetRow } from "@/ui/molecules/sync-target-row";
import { ToolbarSelect } from "@/ui/molecules/toolbar-select";
import { AppHeader } from "@/ui/organisms/app-header";
import { ProjectsGrid, ProjectsTemplate } from "@/ui/templates/projects-template";
import { WorkbenchTemplate } from "@/ui/templates/workbench-template";
import { MODEL_OPTIONS } from "./primitives-demo";
import { Row, Section } from "./section";

const SPECS: { name: string; status: SpecSyncStatus }[] = [
  { name: "sidebar.md", status: "UNSAVED" },
  { name: "editor-pane.md", status: "SYNCED" },
  { name: "chat-toolbar.md", status: "SYNCING" },
  { name: "settings-dialog-with-a-very-long-name.md", status: "ERROR" },
];

const NOW = Date.now();
const iso = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

const WORKSPACES: Workspace[] = [
  {
    id: "w1",
    name: "quick-edit-nbl",
    description: null,
    path: "~/projects/quick-edit-nbl",
    specsDir: "specs",
    storageType: "GIT",
    storageLabel: "acme/quick-edit@main",
    notebookId: "9f1c2e7a",
    status: "ACTIVE",
    lastOpenedAt: iso(12),
    createdAt: iso(10_000),
  },
  {
    id: "w2",
    name: "billing-specs",
    description: null,
    path: "~/work/billing/docs/specs",
    specsDir: "specs",
    storageType: "DRIVE",
    storageLabel: "Specs/Billing",
    notebookId: null,
    status: "ACTIVE",
    lastOpenedAt: iso(60 * 26),
    createdAt: iso(20_000),
  },
  {
    id: "w3",
    name: "old-prototype",
    description: null,
    path: "~/tmp/old-prototype",
    specsDir: "specs",
    storageType: "LOCAL",
    storageLabel: null,
    notebookId: null,
    status: "FOLDER_MISSING",
    lastOpenedAt: null,
    createdAt: iso(90_000),
  },
];

const STEP_STATUSES: PublishStepStatus[] = ["PENDING", "RUNNING", "DONE", "ERROR", "SKIPPED"];

function FieldDemo() {
  const t = useTranslations("uiGallery");
  const [stream, setStream] = React.useState(false);
  return (
    <Section id="field" title={t("sections.field")}>
      <div className="grid max-w-3xl gap-5 md:grid-cols-2">
        <Field label={t("sample.apiKey")} hint={t("sample.apiKeyHint")}>
          <Input mono type="password" defaultValue="sk-xxxx" />
        </Field>
        <Field label={t("sample.notebookId")} error={{ code: "FIELD.TOO_SHORT", params: { min: 8 } }}>
          <Input mono invalid defaultValue="9f1c" />
        </Field>
        <Field label={t("sample.binaryPath")} error={t("sample.binaryNotFound")}>
          <Input mono invalid defaultValue="/usr/bin/agy" />
        </Field>
        <Field layout="inline" label={t("sample.streamStdout")} hint={t("sample.streamStdoutHint")}>
          <Switch checked={stream} onCheckedChange={setStream} />
        </Field>
      </div>
    </Section>
  );
}

function SpecListDemo() {
  const t = useTranslations("uiGallery");
  const [selected, setSelected] = React.useState("sidebar.md");
  const [checked, setChecked] = React.useState<string[]>(["editor-pane.md"]);
  return (
    <Section id="spec-list" title={t("sections.specList")}>
      <div className="w-(--size-sidebar) rounded-lg border border-border bg-sidebar py-2 pr-2 pl-3">
        {SPECS.map((s) => (
          <SpecListItem
            key={s.name}
            name={s.name}
            status={s.status}
            selected={selected === s.name}
            checked={checked.includes(s.name)}
            onSelect={() => setSelected(s.name)}
            onCheckedChange={(v) => setChecked((c) => (v ? [...c, s.name] : c.filter((n) => n !== s.name)))}
            onRename={() => undefined}
            onForceSync={() => undefined}
            onDelete={() => undefined}
          />
        ))}
      </div>
    </Section>
  );
}

function ChatDemo() {
  const t = useTranslations("uiGallery");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <Section id="chat" title={t("sections.chat")}>
      <div className="flex max-w-3xl flex-col gap-2">
        <ChatMessage variant="user">{t("sample.userMessage")}</ChatMessage>
        <ChatMessage variant="assistant">{t("sample.agentMessage")}</ChatMessage>
        <ChatMessage variant="tool" toolName="propose_spec_update" status="SYNCING" statusLabel={t("sample.pendingReview")}>
          {t("sample.toolNote")}
        </ChatMessage>
        <ChatMessage variant="tool" toolName="read_spec" status="SYNCED" statusLabel="OK" />
        <ChatMessage variant="log" logTitle="claude -p … --output-format stream-json" streaming>
          {"› reading specs/sidebar.md\n› tool_use read_spec {\"file\":\"sidebar.md\"}\n› thinking…"}
        </ChatMessage>
        <ChatMessage variant="log" logTitle="aider --yes --message …">
          {"Applied edit to specs/sidebar.md\nTokens: 2.1k sent, 312 received."}
        </ChatMessage>
        <Composer
          value={text}
          onValueChange={setText}
          busy={busy}
          onSubmit={() => {
            setBusy(true);
            setTimeout(() => setBusy(false), 2000);
          }}
          onStop={() => setBusy(false)}
        />
        <Composer value="" onValueChange={() => undefined} onSubmit={() => undefined} disabled />
      </div>
    </Section>
  );
}

function SyncDemo() {
  const t = useTranslations("uiGallery");
  return (
    <Section id="sync" title={t("sections.sync")}>
      <div className="w-[380px] max-w-full overflow-hidden rounded-lg border border-border bg-popover p-1.5 shadow-popover">
        <SyncTargetRow target="LOCAL" status="DONE" detail="specs/sidebar.md · 2.4 KB" />
        <SyncTargetRow target="GIT" status="RUNNING" detail="git push origin main…" />
        <SyncTargetRow target="GIT" label="Git · Pull Request" status="DONE" url="https://github.com/acme/quick-edit/pull/12" urlLabel="PR #12" />
        <SyncTargetRow target="DRIVE" status="ERROR" error={{ code: "RESOURCE.CONFLICT" }} onRetry={() => undefined} />
        <SyncTargetRow target="NOTEBOOK" status="PENDING" detail="refresh source “sidebar.md”" />
        <SyncTargetRow target="NOTEBOOK" status="SKIPPED" />
      </div>
      <Row label="SyncChip">
        {STEP_STATUSES.map((s) => (
          <SyncChip key={s} target="GIT" status={s} />
        ))}
        <SyncChip target="DRIVE" status="DONE" />
        <SyncChip target="NOTEBOOK" status="ERROR" />
      </Row>
    </Section>
  );
}

function ProjectsDemo() {
  const t = useTranslations("uiGallery");
  return (
    <Section id="projects" title={t("sections.projects")}>
      <ProjectsGrid>
        <NewProjectCard onClick={() => undefined} />
        <ProjectCard workspace={WORKSPACES[0]} specCount={12} syncStatus="SYNCED" notebookLabel="Spec Studio" href="#projects" onOpenFolder={() => undefined} onRename={() => undefined} onEditConfig={() => undefined} onRemove={() => undefined} />
        <ProjectCard workspace={WORKSPACES[1]} specCount={4} syncStatus="UNSAVED" onOpen={() => undefined} onRename={() => undefined} onRemove={() => undefined} />
        <ProjectCard workspace={WORKSPACES[2]} syncStatus="ERROR" onLocate={() => undefined} onRemove={() => undefined} />
      </ProjectsGrid>
    </Section>
  );
}

function ConnectorsDemo() {
  const t = useTranslations("uiGallery");
  const [testing, setTesting] = React.useState(false);
  return (
    <Section id="connectors" title={t("sections.connectors")}>
      <div className="flex max-w-2xl flex-col gap-2">
        <ConnectorRow
          name="gh"
          type="CLI"
          provider="GITHUB"
          account="thangtn @ github.com · gh 2.62.0"
          state="CONNECTED"
          testing={testing}
          onTest={() => {
            setTesting(true);
            setTimeout(() => setTesting(false), 1200);
          }}
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
        <ConnectorRow name="glab" type="CLI" provider="GITLAB" account="gitlab.example.com" state="NEEDS_LOGIN" onTest={() => undefined} onEdit={() => undefined} />
        <ConnectorRow name="github-mcp" type="MCP" provider="GITHUB" account="npx @modelcontextprotocol/server-github" state="CONNECTED" onDelete={() => undefined} />
        <ConnectorRow name="tea" type="CLI" provider="GITEA" state="NOT_FOUND" onTest={() => undefined} />
        <ConnectorRow name="Bitbucket PAT" type="TOKEN" provider="BITBUCKET" account="••••3f9a" state="CONNECTED" />
        <ConnectorRow name="id_ed25519" type="SSH" provider="GENERIC" account="~/.ssh/id_ed25519" state="CONNECTED" />
      </div>
    </Section>
  );
}

function EmptyDemo() {
  const t = useTranslations("uiGallery");
  const tc = useTranslations("common.actions");
  return (
    <Section id="empty" title={t("sections.empty")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border">
          <EmptyState icon={MessageSquare} title={t("sample.emptyLogTitle")} description={t("sample.emptyLogDescription")} />
        </div>
        <div className="rounded-lg border border-border">
          <EmptyState
            size="screen"
            icon={FolderPlus}
            title={t("sample.emptyTitle")}
            description={t("sample.emptyDescription")}
            actions={
              <>
                <Button variant="primary" icon={Plus}>
                  {tc("newProject")}
                </Button>
                <Button variant="outline" icon={FolderOpen}>
                  {t("sample.openExisting")}
                </Button>
              </>
            }
          />
        </div>
      </div>
    </Section>
  );
}

function ToolbarDemo() {
  const t = useTranslations("uiGallery");
  const [mode, setMode] = React.useState<AgentMode>("API");
  const [model, setModel] = React.useState("gemini-2.5-pro");
  const [profile, setProfile] = React.useState("claude-code");
  return (
    <Section id="toolbar" title={t("sections.toolbar")}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <ModeSwitch value={mode} onValueChange={setMode} />
        {mode === "API" ? (
          <ToolbarSelect options={MODEL_OPTIONS} value={model} onChange={setModel} allowCustom aria-label={t("sample.model")} />
        ) : (
          <ToolbarSelect options={["claude-code", "codex", "agy", "aider", "custom"]} value={profile} onChange={setProfile} aria-label={t("sample.cliProfile")} />
        )}
        <span className="text-xs text-muted-foreground">{t("sample.inContext", { count: 2 })}</span>
        <span className="flex-1" />
        <IconButton icon={Settings} label="Settings" size="icon-sm" />
      </div>
      <Row label="ModeSwitch sm / disabled">
        <ModeSwitch value="CLI" onValueChange={() => undefined} size="sm" />
        <ModeSwitch value="API" onValueChange={() => undefined} disabled />
      </Row>
    </Section>
  );
}

function HeaderDemo() {
  const t = useTranslations("uiGallery");
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  return (
    <Section id="header" title={t("sections.header")}>
      <div className="overflow-hidden rounded-lg border border-border">
        <AppHeader
          sidebar={{ collapsed, onToggle: toggle }}
          path="~/projects/quick-edit-nbl/specs"
          syncChips={
            <>
              <SyncChip target="GIT" status="DONE" />
              <SyncChip target="DRIVE" status="RUNNING" />
              <SyncChip target="NOTEBOOK" status="ERROR" />
            </>
          }
          storageStatus={
            <Button variant="ghost" size="sm">
              Push <Badge variant="primary">2</Badge>
            </Button>
          }
          onOpenSettings={() => undefined}
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <AppHeader onOpenSettings={() => undefined} />
      </div>
    </Section>
  );
}

function Slot({ name, className }: { name: string; className?: string }) {
  const t = useTranslations("uiGallery.labels");
  return (
    <div className={cn("grid min-h-0 flex-1 place-items-center rounded-lg border border-dashed border-border bg-editor text-xs text-muted-foreground", className)}>
      {t("slot", { name })}
    </div>
  );
}

function WorkbenchDemo() {
  const t = useTranslations("uiGallery");
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const [text, setText] = React.useState("");
  const [mode, setMode] = React.useState<AgentMode>("API");
  return (
    <Section id="workbench" title={t("sections.workbench")}>
      <div className="h-[620px] overflow-hidden rounded-lg border border-border">
        <WorkbenchTemplate
          collapsed={collapsed}
          header={<AppHeader sidebar={{ collapsed, onToggle: toggle }} path="~/projects/quick-edit-nbl/specs" onOpenSettings={() => undefined} />}
          sidebar={
            collapsed ? null : (
              <div className="flex flex-col gap-px py-2 pr-2 pl-3">
                <Label variant="overline" className="px-2 py-2">
                  Specs
                </Label>
                {SPECS.map((s, i) => (
                  <SpecListItem key={s.name} name={s.name} status={s.status} checked={i === 1} selected={i === 0} onRename={() => undefined} />
                ))}
              </div>
            )
          }
          editor={<Slot name={t("sample.editorSlot")} />}
          chatLog={
            <>
              <ChatMessage variant="user">{t("sample.userMessage")}</ChatMessage>
              <ChatMessage variant="assistant">{t("sample.agentMessage")}</ChatMessage>
            </>
          }
          toolbar={
            <>
              <ModeSwitch value={mode} onValueChange={setMode} />
              <ToolbarSelect options={MODEL_OPTIONS} defaultValue="gemini-2.5-pro" aria-label={t("sample.model")} />
            </>
          }
          composer={<Composer value={text} onValueChange={setText} onSubmit={() => setText("")} />}
        />
      </div>
    </Section>
  );
}

function ProjectsTemplateDemo() {
  const t = useTranslations("uiGallery");
  const tc = useTranslations("common.actions");
  return (
    <Section id="projects-template" title={t("sections.projectsTemplate")}>
      <div className="h-[520px] overflow-hidden rounded-lg border border-border">
        <ProjectsTemplate
          header={<AppHeader onOpenSettings={() => undefined} />}
          title={t("sample.projectsTitle")}
          description={t("sample.projectsCount")}
          actions={
            <>
              <Button variant="outline" icon={FolderOpen}>
                {t("sample.openExisting")}
              </Button>
              <Button variant="primary" icon={Plus}>
                {tc("newProject")}
              </Button>
            </>
          }
          toolbar={
            <>
              <InputGroup className="max-w-[360px] flex-1">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput placeholder={t("sample.search")} aria-label={t("sample.search")} />
              </InputGroup>
              <Tabs defaultValue="all">
                <TabsList variant="pill">
                  <TabsTrigger value="all">{t("sample.filterAll")}</TabsTrigger>
                  <TabsTrigger value="LOCAL">Local</TabsTrigger>
                  <TabsTrigger value="GIT">Git</TabsTrigger>
                  <TabsTrigger value="DRIVE">Drive</TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">{t("sample.sortRecent")}</span>
            </>
          }
        >
          <ProjectsGrid>
            <NewProjectCard />
            {WORKSPACES.map((w) => (
              <ProjectCard key={w.id} workspace={w} specCount={3} syncStatus="SYNCED" onOpen={() => undefined} onRemove={() => undefined} />
            ))}
          </ProjectsGrid>
        </ProjectsTemplate>
      </div>
    </Section>
  );
}

export function MoleculesDemo() {
  return (
    <>
      <FieldDemo />
      <SpecListDemo />
      <ChatDemo />
      <SyncDemo />
      <ProjectsDemo />
      <ConnectorsDemo />
      <EmptyDemo />
      <ToolbarDemo />
      <HeaderDemo />
      <WorkbenchDemo />
      <ProjectsTemplateDemo />
    </>
  );
}

