import type * as React from 'react';

export type IconName = 'settings' | 'panel-left' | 'ellipsis' | 'send-horizontal' | 'check' | 'x' | 'refresh-cw' | 'file-text' | 'terminal' | 'key-round' | 'loader-circle' | 'circle-alert' | 'trash-2' | 'pencil' | 'plus' | 'chevron-down' | 'bot' | 'cloud-upload' | 'git-compare' | 'search' | 'info' | 'triangle-alert';
export type SyncStatus = 'synced' | 'unsaved' | 'syncing' | 'error';
export type AgentMode = 'api' | 'cli';

export interface IconProps { name: IconName; size?: number; strokeWidth?: number; spin?: boolean; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = hành động chính (Approve & Save, Send, Save); secondary = Reject/Test; outline; ghost = Cancel; tonal = Force Sync; destructive = Delete */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'tonal' | 'destructive';
  size?: 'md' | 'sm';
  icon?: IconName; iconRight?: IconName; loading?: boolean;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { icon: IconName; label: string; active?: boolean; size?: 'md' | 'sm' }
export declare function IconButton(props: IconButtonProps): React.ReactElement;

export interface KbdProps { children: React.ReactNode }
export declare function Kbd(props: KbdProps): React.ReactElement;

export interface StatusBadgeProps { status: SyncStatus; label?: string; compact?: boolean }
export declare function StatusBadge(props: StatusBadgeProps): React.ReactElement;

export interface CheckboxProps { checked?: boolean; indeterminate?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void; label?: string; children?: React.ReactNode; className?: string }
export declare function Checkbox(props: CheckboxProps): React.ReactElement;

export interface SpecListItemProps {
  name: string; status?: SyncStatus; checked?: boolean; selected?: boolean;
  onSelect?: (name: string) => void; onCheck?: (name: string, checked: boolean) => void; onMenu?: (name: string, event: React.MouseEvent) => void;
}
export declare function SpecListItem(props: SpecListItemProps): React.ReactElement;

export interface MenuItem { id?: string; label?: string; icon?: IconName; shortcut?: string; tone?: 'destructive'; divider?: boolean }
export interface ContextMenuProps { items?: MenuItem[]; onSelect?: (id: string) => void; style?: React.CSSProperties; className?: string }
export declare function ContextMenu(props: ContextMenuProps): React.ReactElement;

export interface SpecSidebarProps {
  specs: Array<{ name: string; status?: SyncStatus; checked?: boolean }>; selected?: string; collapsed?: boolean;
  onToggle?: () => void; onCreate?: () => void; onCheckAll?: (checked: boolean) => void; onSelect?: (name: string) => void; onCheck?: (name: string, checked: boolean) => void; onMenu?: (name: string, event: React.MouseEvent) => void;
  footer?: React.ReactNode;
}
export declare function SpecSidebar(props: SpecSidebarProps): React.ReactElement;

export interface AppHeaderProps { title?: string; path?: string; onSettings?: () => void; onToggleSidebar?: () => void; children?: React.ReactNode }
export declare function AppHeader(props: AppHeaderProps): React.ReactElement;

export interface ModeSwitchProps { value: AgentMode; onChange?: (mode: AgentMode) => void }
export declare function ModeSwitch(props: ModeSwitchProps): React.ReactElement;

export interface SelectOption { value: string; label: string; group?: string; hint?: string }
export interface SelectProps {
  options: Array<string | SelectOption>;
  /** multiple: value/defaultValue là string[] và onChange nhận string[] */
  multiple?: boolean; maxTags?: number;
  value?: string | string[]; defaultValue?: string | string[]; onChange?: (value: any) => void;
  size?: 'md' | 'sm'; mono?: boolean; width?: number | string; align?: 'start' | 'end'; /** 'top' khi Select nằm sát đáy màn hình (Quick Setting Toolbar) */ side?: 'bottom' | 'top'; placeholder?: string; disabled?: boolean;
  /** true/false ép bật/tắt ô tìm; mặc định tự bật khi options.length >= searchThreshold */
  searchable?: boolean; searchThreshold?: number; searchPlaceholder?: string;
  /** cho phép chọn giá trị tự gõ khi không khớp item nào (Model ID) */
  allowCustom?: boolean; defaultOpen?: boolean; className?: string; 'aria-label'?: string;
}
export declare function Select(props: SelectProps): React.ReactElement;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { mono?: boolean; invalid?: boolean }
export declare function Input(props: InputProps): React.ReactElement;

export interface FieldProps { label: string; hint?: string; error?: string; inline?: boolean; htmlFor?: string; children: React.ReactNode }
export declare function Field(props: FieldProps): React.ReactElement;

export interface SwitchProps { checked?: boolean; onChange?: (checked: boolean) => void; label: string }
export declare function Switch(props: SwitchProps): React.ReactElement;

export interface TabsProps { tabs: Array<{ id: string; label: string; icon?: IconName }>; value: string; onChange?: (id: string) => void; variant?: 'underline' | 'pill' }
export declare function Tabs(props: TabsProps): React.ReactElement;

export interface ChatToolbarProps { mode: AgentMode; model?: string; options?: SelectProps['options']; contextCount?: number; onModeChange?: (mode: AgentMode) => void; onModelChange?: (value: string) => void; onSettings?: () => void }
export declare function ChatToolbar(props: ChatToolbarProps): React.ReactElement;

export interface ComposerProps { value?: string; defaultValue?: string; onChange?: (value: string) => void; onSend?: (value: string) => void; onStop?: () => void; busy?: boolean; placeholder?: string }
export declare function Composer(props: ComposerProps): React.ReactElement;

export interface ChatMessageProps { role: 'user' | 'assistant' | 'tool' | 'log'; title?: string; icon?: IconName; status?: SyncStatus; statusLabel?: string; streaming?: boolean; children?: React.ReactNode }
export declare function ChatMessage(props: ChatMessageProps): React.ReactElement;

export interface EditorPaneProps { filename: string; lines: string[]; status?: SyncStatus; cursorLine?: number; actions?: React.ReactNode }
export declare function EditorPane(props: EditorPaneProps): React.ReactElement;

export interface DiffReviewBarProps { filename: string; added?: number; removed?: number; saving?: boolean; autoSync?: boolean; onApprove?: () => void; onReject?: () => void }
export declare function DiffReviewBar(props: DiffReviewBarProps): React.ReactElement;

export interface DiffRow { kind: 'same' | 'change' | 'add' | 'remove'; left?: string; right?: string; leftMark?: [number, number]; rightMark?: [number, number] }
export interface DiffViewProps extends DiffReviewBarProps { rows: DiffRow[] }
export declare function DiffView(props: DiffViewProps): React.ReactElement;

export interface ToastProps {
  variant?: 'info' | 'warning' | 'error'; title: string; description?: React.ReactNode;
  action?: { label: string; onClick?: () => void }; loading?: boolean; onClose?: (() => void) | false; className?: string;
}
export declare function Toast(props: ToastProps): React.ReactElement;

export interface SettingsDialogProps { tab?: 'api' | 'cli' | 'nbl'; onClose?: () => void; onSave?: () => void }
export declare function SettingsDialog(props: SettingsDialogProps): React.ReactElement;

export interface WorkbenchProps { specs?: SpecSidebarProps['specs']; selected?: string; diff?: boolean }
export declare function Workbench(props: WorkbenchProps): React.ReactElement;

declare global { interface Window { SpecStudio: { Icon: typeof Icon; Button: typeof Button; IconButton: typeof IconButton; Kbd: typeof Kbd; StatusBadge: typeof StatusBadge; Checkbox: typeof Checkbox; SpecListItem: typeof SpecListItem; ContextMenu: typeof ContextMenu; SpecSidebar: typeof SpecSidebar; AppHeader: typeof AppHeader; ModeSwitch: typeof ModeSwitch; Select: typeof Select; Input: typeof Input; Field: typeof Field; Switch: typeof Switch; Tabs: typeof Tabs; ChatToolbar: typeof ChatToolbar; Composer: typeof Composer; ChatMessage: typeof ChatMessage; EditorPane: typeof EditorPane; DiffReviewBar: typeof DiffReviewBar; DiffView: typeof DiffView; Toast: typeof Toast; SettingsDialog: typeof SettingsDialog; Workbench: typeof Workbench } } }
