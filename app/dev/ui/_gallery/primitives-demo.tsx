"use client";

import * as React from "react";
import {
  Check,
  CloudUpload,
  Copy,
  Ellipsis,
  FolderOpen,
  PanelLeft,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SendHorizontal,
  Settings,
  Terminal,
  Trash,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useFlash } from "@/client/hooks/use-flash";
import { Badge, Dot, StatusBadge } from "@/ui/primitives/badge";
import { Button, IconButton } from "@/ui/primitives/button";
import { Checkbox } from "@/ui/primitives/checkbox";
import { Combobox } from "@/ui/primitives/combobox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/ui/primitives/context-menu";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/primitives/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";
import { Icon } from "@/ui/primitives/icon";
import { Input } from "@/ui/primitives/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ui/primitives/input-group";
import { Kbd, KbdGroup } from "@/ui/primitives/kbd";
import { Label } from "@/ui/primitives/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/primitives/popover";
import { RadioGroup, RadioGroupItem } from "@/ui/primitives/radio-group";
import { Segmented, SegmentedItem } from "@/ui/primitives/segmented";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/ui/primitives/select";
import { Separator } from "@/ui/primitives/separator";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";
import { Switch } from "@/ui/primitives/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import { Textarea } from "@/ui/primitives/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/primitives/tooltip";
import { Field } from "@/ui/molecules/field";
import { Row, Section } from "./section";

export const GALLERY_TOASTER = "dev-ui";

const VARIANTS = ["primary", "secondary", "outline", "ghost", "tonal", "destructive", "text", "link"] as const;
const STATUSES = ["SYNCED", "UNSAVED", "SYNCING", "ERROR"] as const;

export const MODEL_OPTIONS = [
  { value: "gemini-2.5-pro", group: "Google Gemini", hint: "1M ctx" },
  { value: "gemini-2.5-flash", group: "Google Gemini", hint: "1M ctx" },
  { value: "claude-opus-4-1", group: "Anthropic", hint: "200k" },
  { value: "claude-sonnet-4-5", group: "Anthropic", hint: "200k" },
  { value: "claude-haiku-4-5", group: "Anthropic", hint: "200k" },
  { value: "gpt-5", group: "OpenAI", hint: "400k" },
  { value: "gpt-5-mini", group: "OpenAI", hint: "400k" },
  { value: "deepseek-chat", group: "DeepSeek" },
  { value: "llama3.1:8b", group: "Ollama / Local" },
];

const TOOL_OPTIONS = ["read_spec", "propose_spec_update", "list_specs", "search_specs", "git_status", "notebook_refresh"];

function ButtonsDemo() {
  const t = useTranslations("uiGallery");
  const tc = useTranslations("common.actions");
  const [saving, setSaving] = React.useState(false);
  const [saved, flashSaved] = useFlash();
  const [sidebarOn, setSidebarOn] = React.useState(true);

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      flashSaved();
    }, 1200);
  };

  return (
    <Section id="buttons" title={t("sections.buttons")}>
      <Row label={t("labels.variants")}>
        {VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
      </Row>
      <Row label={t("labels.sizes")}>
        <Button variant="primary" size="sm" icon={SendHorizontal}>
          Send
        </Button>
        <Button variant="primary" size="md" icon={SendHorizontal}>
          Send
        </Button>
        <Button variant="secondary" size="sm">
          Reject
        </Button>
        <Button variant="outline" size="md" icon={FolderOpen}>
          {tc("openFolder")}
        </Button>
        <Button variant="tonal" icon={RefreshCw}>
          Force Sync
        </Button>
        <Button variant="destructive" icon={Trash}>
          Delete spec
        </Button>
      </Row>
      <Row label={t("labels.states")}>
        <Button variant="primary" className="min-w-[120px]" icon={Check} loading={saving} success={saved} loadingText={tc("saving")} successText={tc("saved")} onClick={save}>
          Approve &amp; Save
        </Button>
        <Button variant="primary" loading loadingText={tc("saving")}>
          Save
        </Button>
        <Button variant="primary" success successText={tc("saved")}>
          Save
        </Button>
        <Button variant="primary" disabled>
          Send
        </Button>
        <Button variant="outline" disabled>
          {tc("test")}
        </Button>
      </Row>
      <Row label={t("labels.iconMotion")}>
        <Button variant="secondary" icon={SendHorizontal}>
          Send
        </Button>
        <Button variant="secondary" icon={RefreshCw}>
          Refresh
        </Button>
        <Button variant="secondary" icon={CloudUpload}>
          Push
        </Button>
        <Button variant="secondary" icon={X}>
          Reject
        </Button>
        <Button variant="secondary" icon={Plus}>
          New Project
        </Button>
        <Button variant="secondary" icon={Check}>
          Approve
        </Button>
        <Button variant="secondary" icon={Trash}>
          Delete
        </Button>
      </Row>
      <Row label="IconButton">
        <IconButton icon={PanelLeft} label={tc("toggleSidebar")} active={sidebarOn} onClick={() => setSidebarOn((v) => !v)} />
        <IconButton icon={Settings} label={tc("settings")} />
        <IconButton icon={Ellipsis} label={tc("more")} />
        <IconButton icon={Plus} label={tc("newProject")} />
        <IconButton icon={Plus} label={tc("newProject")} size="icon-sm" />
        <IconButton icon={Copy} label="Copy" variant="outline" />
        <IconButton icon={RefreshCw} label="Refresh" loading />
        <IconButton icon={Settings} label={tc("settings")} disabled />
      </Row>
    </Section>
  );
}

function BadgesDemo() {
  const t = useTranslations("uiGallery");
  return (
    <Section id="badges" title={t("sections.badges")}>
      <Row label={t("labels.variants")}>
        {(["neutral", "primary", "destructive", "outline", "solid", "mutedPrimary", "mutedDestructive"] as const).map((v) => (
          <Badge key={v} variant={v}>
            {v}
          </Badge>
        ))}
      </Row>
      <Row label={t("labels.sizes")}>
        <Badge size="xs">
          <Dot className="size-1.5" />
          Git
        </Badge>
        <Badge size="sm">sm</Badge>
        <Badge size="md">
          <Icon icon={Terminal} size="xs" />
          Git <code>main</code>
        </Badge>
      </Row>
      <Row label={`StatusBadge · ${t("labels.full")}`}>
        {STATUSES.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
        <StatusBadge status="SYNCING" label={t("sample.pendingReview")} />
      </Row>
      <Row label={`StatusBadge · ${t("labels.compact")}`}>
        {STATUSES.map((s) => (
          <StatusBadge key={s} status={s} compact />
        ))}
      </Row>
      <Row label="Kbd">
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>Enter</Kbd>
        </KbdGroup>
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>Enter</Kbd>
        </KbdGroup>
        <Kbd surface="muted">Esc</Kbd>
      </Row>
      <Row label="Spinner">
        <Spinner size="xs" tone="primary" />
        <Spinner size="sm" tone="primary" />
        <Spinner size="md" tone="primary" label="Loading" />
        <Spinner size="lg" tone="muted" />
      </Row>
      <Row label="Icon 16 / 14 / 12">
        <Icon icon={Settings} size="md" />
        <Icon icon={Settings} size="sm" />
        <Icon icon={Settings} size="xs" />
        <Icon icon={Check} tone="primary" />
        <Icon icon={Trash} tone="destructive" />
        <Icon icon={Search} tone="muted" />
      </Row>
    </Section>
  );
}

function InputsDemo() {
  const t = useTranslations("uiGallery");
  const [prompt, setPrompt] = React.useState("");
  return (
    <Section id="inputs" title={t("sections.inputs")}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("sample.binaryPath")}>
          <Input mono defaultValue="/usr/local/bin/claude" />
        </Field>
        <Field label={t("sample.apiKey")} hint={t("sample.apiKeyHint")}>
          <Input mono type="password" defaultValue="sk-ant-api03-xxxxxxxx" />
        </Field>
        <Field label={t("sample.notebookId")} error={{ code: "FIELD.REQUIRED" }}>
          <Input mono invalid placeholder="nb_…" />
        </Field>
        <Field label="Small · disabled">
          <Input size="sm" disabled defaultValue="read only" />
        </Field>
        <Field label={t("sample.systemPrompt")}>
          <Textarea defaultValue="Bạn là trợ lý viết spec. Trả lời ngắn gọn, giữ nguyên định dạng Markdown." />
        </Field>
        <Field label="Textarea autosize (max 200px)">
          <Textarea autosize rows={1} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="…" />
        </Field>
        <Field label="InputGroup">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput placeholder={t("sample.search")} />
          </InputGroup>
        </Field>
      </div>
    </Section>
  );
}

function ChoicesDemo() {
  const t = useTranslations("uiGallery");
  const [all, setAll] = React.useState<boolean | "indeterminate">("indeterminate");
  const [stream, setStream] = React.useState(true);
  return (
    <Section id="choices" title={t("sections.choices")}>
      <Row label="Checkbox">
        <Checkbox label="unchecked" />
        <Checkbox label="checked" defaultChecked />
        <Checkbox label="indeterminate" checked="indeterminate" />
        <Checkbox label="disabled" disabled />
        <Checkbox label="disabled checked" disabled defaultChecked />
        <Checkbox checked={all} onCheckedChange={(v) => setAll(v)}>
          {t("sample.attachAll")}
        </Checkbox>
      </Row>
      <Row label="Switch">
        <Switch aria-label="off" />
        <Switch aria-label="on" defaultChecked />
        <Switch aria-label="disabled" disabled />
        <Switch aria-label="sm" size="sm" defaultChecked />
      </Row>
      <div className="max-w-md">
        <Field layout="inline" label={t("sample.streamStdout")} hint={t("sample.streamStdoutHint")}>
          <Switch checked={stream} onCheckedChange={setStream} />
        </Field>
      </div>
      <Row label="RadioGroup">
        <RadioGroup defaultValue="drive_sync" className="flex gap-4">
          <Label>
            <RadioGroupItem value="drive_sync" />
            drive_sync
          </Label>
          <Label>
            <RadioGroupItem value="rpc" />
            rpc
          </Label>
          <Label>
            <RadioGroupItem value="off" disabled />
            disabled
          </Label>
        </RadioGroup>
      </Row>
      <Row label="Segmented">
        <Segmented defaultValue="api" aria-label="segmented md">
          <SegmentedItem value="api">API Key</SegmentedItem>
          <SegmentedItem value="cli">CLI Agent</SegmentedItem>
        </Segmented>
        <Segmented defaultValue="a" size="sm" aria-label="segmented sm">
          <SegmentedItem value="a">Editor</SegmentedItem>
          <SegmentedItem value="b">Diff</SegmentedItem>
          <SegmentedItem value="c" disabled>
            Preview
          </SegmentedItem>
        </Segmented>
      </Row>
      <div className="grid gap-6 md:grid-cols-2">
        <Tabs defaultValue="api" className="gap-3">
          <TabsList>
            <TabsTrigger value="api">{t("sample.tabApi")}</TabsTrigger>
            <TabsTrigger value="cli">{t("sample.tabCli")}</TabsTrigger>
            <TabsTrigger value="nbl">{t("sample.tabNbl")}</TabsTrigger>
          </TabsList>
          <TabsContent value="api" className="text-[13px] text-muted-foreground">
            line · {t("sample.tabApi")}
          </TabsContent>
          <TabsContent value="cli" className="text-[13px] text-muted-foreground">
            line · {t("sample.tabCli")}
          </TabsContent>
          <TabsContent value="nbl" className="text-[13px] text-muted-foreground">
            line · {t("sample.tabNbl")}
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="all" className="gap-3">
          <TabsList variant="pill">
            <TabsTrigger value="all">{t("sample.filterAll")}</TabsTrigger>
            <TabsTrigger value="local">Local</TabsTrigger>
            <TabsTrigger value="git">Git</TabsTrigger>
            <TabsTrigger value="drive">Drive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Separator />
      <Row label="Label">
        <Label>Provider</Label>
        <Label variant="overline">Specs</Label>
      </Row>
    </Section>
  );
}

function SelectsDemo() {
  const t = useTranslations("uiGallery");
  const [model, setModel] = React.useState("claude-sonnet-4-5");
  const [tools, setTools] = React.useState<string[]>(["read_spec", "propose_spec_update", "list_specs"]);
  return (
    <Section id="selects" title={t("sections.selects")}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("sample.provider")}>
          <Select defaultValue="anthropic">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Provider</SelectLabel>
                <SelectItem value="google">Google Gemini</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="ollama" hint="BaseURL">
                  Ollama / Local
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("sample.model")}>
          <Combobox options={MODEL_OPTIONS} value={model} onChange={setModel} mono allowCustom />
        </Field>
        <Field label={t("sample.tools")}>
          <Combobox multiple options={TOOL_OPTIONS} value={tools} onChange={setTools} mono searchable />
        </Field>
        <Field label="Select · sm · mono">
          <Select defaultValue="claude-code">
            <SelectTrigger size="sm" mono>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claude-code" mono>
                claude-code
              </SelectItem>
              <SelectItem value="codex" mono>
                codex
              </SelectItem>
              <SelectItem value="agy" mono>
                agy
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Combobox · placeholder">
          <Combobox options={["LOCAL", "GIT", "DRIVE"]} />
        </Field>
        <Field label="Combobox · disabled">
          <Combobox options={["a"]} defaultValue="a" disabled />
        </Field>
      </div>
    </Section>
  );
}

function OverlaysDemo() {
  const t = useTranslations("uiGallery");
  const tc = useTranslations("common.actions");
  const [autoSync, setAutoSync] = React.useState(true);
  return (
    <Section id="overlays" title={t("sections.overlays")}>
      <Row>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" icon={Settings}>
              {t("labels.openSettings")}
            </Button>
          </DialogTrigger>
          <DialogContent height="settings">
            <DialogHeader>
              <DialogTitle>{t("sample.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("sample.dialogDescription")}</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="api" className="min-h-0 flex-1">
              <TabsList className="px-6">
                <TabsTrigger value="api">{t("sample.tabApi")}</TabsTrigger>
                <TabsTrigger value="cli">{t("sample.tabCli")}</TabsTrigger>
                <TabsTrigger value="nbl">{t("sample.tabNbl")}</TabsTrigger>
              </TabsList>
              <TabsContent value="api" asChild>
                <DialogBody>
                  <Field label={t("sample.provider")}>
                    <Combobox options={["Google Gemini", "Anthropic", "OpenAI", "DeepSeek", "Ollama / Local BaseURL"]} defaultValue="Anthropic" />
                  </Field>
                  <Field label={t("sample.apiKey")} hint={t("sample.apiKeyHint")}>
                    <Input mono type="password" defaultValue="sk-ant-xxxxxxxx" />
                  </Field>
                  <Field label={t("sample.model")}>
                    <Combobox options={MODEL_OPTIONS} defaultValue="claude-sonnet-4-5" mono allowCustom />
                  </Field>
                  <Field label={t("sample.systemPrompt")}>
                    <Textarea rows={8} defaultValue={"# Persona\n- Viết spec ngắn gọn\n- Giữ nguyên heading\n"} />
                  </Field>
                </DialogBody>
              </TabsContent>
              <TabsContent value="cli" asChild>
                <DialogBody>
                  <Field label={t("sample.binaryPath")}>
                    <Input mono defaultValue="/usr/local/bin/claude" />
                  </Field>
                </DialogBody>
              </TabsContent>
              <TabsContent value="nbl" asChild>
                <DialogBody>
                  <Field label={t("sample.notebookId")}>
                    <Input mono defaultValue="9f1c2e7a" />
                  </Field>
                  <Field layout="inline" label={t("sample.autoSync")}>
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                  </Field>
                </DialogBody>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">.spec-studio/config.json</span>
              <DialogClose asChild>
                <Button variant="ghost">{tc("cancel")}</Button>
              </DialogClose>
              <Button variant="primary">{tc("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" icon={Trash}>
              {t("labels.openConfirm")}
            </Button>
          </DialogTrigger>
          <DialogContent size="sm" showCloseButton={false}>
            <DialogHeader className="pr-6">
              <DialogTitle>{t("sample.confirmTitle")}</DialogTitle>
              <DialogDescription>{t("sample.confirmDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 justify-end">
              <DialogClose asChild>
                <Button variant="ghost">{tc("cancel")}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" icon={Trash}>
                  {tc("deleteSpec")}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">{t("labels.openMenu")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Spec</DropdownMenuLabel>
            <DropdownMenuItem>
              <Pencil />
              {tc("rename")}
              <DropdownMenuShortcut>F2</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RefreshCw />
              {tc("forceSync")}
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem checked={autoSync} onCheckedChange={(v) => setAutoSync(v === true)}>
              Auto sync
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem disabled>
              <Copy />
              Disabled
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="destructive">
              <Trash />
              {tc("deleteSpec")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">{t("labels.openPopover")}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-[13px] text-muted-foreground">{t("sample.popoverText")}</PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">{t("labels.hoverMe")}</Button>
          </TooltipTrigger>
          <TooltipContent>
            Send
            <KbdGroup>
              <Kbd surface="inverse">⌘</Kbd>
              <Kbd surface="inverse">Enter</Kbd>
            </KbdGroup>
          </TooltipContent>
        </Tooltip>
      </Row>
      <ContextMenu>
        <ContextMenuTrigger className="grid h-20 place-items-center rounded-lg border border-dashed border-border text-[13px] text-muted-foreground">
          {t("labels.rightClick")}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>
            <Pencil />
            {tc("rename")}
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem>
            <RefreshCw />
            {tc("forceSync")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem tone="destructive">
            <Trash />
            {tc("deleteSpec")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Section>
  );
}

function ToastsDemo() {
  const t = useTranslations("uiGallery");
  const tc = useTranslations("common.actions");
  const opts = { toasterId: GALLERY_TOASTER };
  return (
    <Section id="toasts" title={t("sections.toasts")}>
      <Row>
        <Button variant="outline" onClick={() => notify.info(t("sample.toastSavedTitle"), opts)}>
          {t("toast.info")}
        </Button>
        <Button variant="outline" onClick={() => notify.info(t("sample.toastSyncingTitle"), { ...opts, loading: true, id: "sync" })}>
          {t("toast.loading")}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            notify.warning(t("sample.toastWarnTitle"), {
              ...opts,
              description: t("sample.toastWarnDescription"),
              action: { label: t("sample.openSettings"), onClick: () => undefined },
            })
          }
        >
          {t("toast.warning")}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            notify.error(t("sample.toastErrorTitle"), {
              ...opts,
              description: t("sample.toastErrorDescription"),
              action: { label: tc("retry"), onClick: () => notify.dismiss("sync") },
            })
          }
        >
          {t("toast.error")}
        </Button>
      </Row>
    </Section>
  );
}

export function PrimitivesDemo() {
  return (
    <>
      <ButtonsDemo />
      <BadgesDemo />
      <InputsDemo />
      <ChoicesDemo />
      <SelectsDemo />
      <OverlaysDemo />
      <ToastsDemo />
    </>
  );
}
