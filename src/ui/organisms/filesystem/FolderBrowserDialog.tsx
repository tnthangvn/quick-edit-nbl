"use client";

import * as React from "react";
import {
  ArrowUp,
  Check,
  CornerDownLeft,
  Folder,
  FolderPlus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useBrowseDirectory, useCreateDirectory } from "@/client/api/generated";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Button, IconButton } from "@/ui/primitives/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";
import { Icon } from "@/ui/primitives/icon";
import { Input } from "@/ui/primitives/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/ui/primitives/input-group";
import { RowButton } from "@/ui/primitives/row-button";
import { Spinner } from "@/ui/primitives/spinner";

export type FolderBrowserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Thư mục mở lần đầu; bỏ trống = thư mục home (BE tự suy ra). */
  initialPath?: string;
  onSelect: (path: string) => void;
};

/**
 * Dialog duyệt thư mục trong app (không phải OS dialog thật — web app chạy qua Next dev server không có quyền mở
 * dialog hệ điều hành). Gọi `GET /api/filesystem/browse` để liệt kê thư mục con, điều hướng qua lại.
 * Ô tìm nhanh lọc thư mục con của thư mục đang xem (không phân biệt hoa thường); Enter mở kết quả đầu, Esc xoá.
 * Nút "Thư mục mới": nhập tên ngay trong danh sách, Enter tạo (POST `createDirectory`) rồi mở vào thư mục vừa tạo.
 */
export function FolderBrowserDialog({
  open,
  onOpenChange,
  initialPath,
  onSelect,
}: FolderBrowserDialogProps) {
  const t = useTranslations("filesystem.browser");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const [cursor, setCursor] = React.useState(initialPath);
  const [typed, setTyped] = React.useState("");
  const [filter, setFilter] = React.useState("");
  const [newName, setNewName] = React.useState<string | null>(null);
  // Mỗi lần dialog mở lại: quay về initialPath (xem https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCursor(initialPath);
      setTyped("");
      setFilter("");
      setNewName(null);
    }
  }

  const browse = useBrowseDirectory(cursor ? { path: cursor } : undefined, {
    query: { enabled: open },
  });
  const dir = browse.data;

  const goTo = (path: string) => {
    setCursor(path);
    setTyped("");
    setFilter("");
    setNewName(null);
  };

  const create = useCreateDirectory({
    mutation: { onSuccess: (r) => goTo(r.path) },
  });
  const submitNew = () => {
    const name = newName?.trim();
    if (!dir || !name || create.isPending) return;
    create.mutate({ data: { parent: dir.path, name } });
  };

  const q = filter.trim().toLowerCase();
  const entries = React.useMemo(() => {
    const all = dir?.entries ?? [];
    if (!q) return all;
    // Tên bắt đầu bằng chuỗi tìm lên trước, sau đó tới tên chứa chuỗi.
    const starts = all.filter((e) => e.name.toLowerCase().startsWith(q));
    const contains = all.filter(
      (e) =>
        !e.name.toLowerCase().startsWith(q) && e.name.toLowerCase().includes(q),
    );
    return [...starts, ...contains];
  }, [dir, q]);
  const childPath = (name: string) => `${dir!.path.replace(/\/$/, "")}/${name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" height="auto" className="h-[560px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) goTo(typed.trim());
            }}
          >
            <Input
              mono
              placeholder={t("pathPlaceholder")}
              value={typed || dir?.path || ""}
              onChange={(e) => setTyped(e.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              icon={CornerDownLeft}
            >
              {t("goTo")}
            </Button>
          </form>

          {browse.isPending ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner label={t("title")} />
            </div>
          ) : browse.isError ? (
            <p className="m-0 flex items-center gap-1.5 text-sm text-destructive">
              <Icon icon={TriangleAlert} size="sm" />
              {errorMessage(browse.error)}
            </p>
          ) : dir ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <Icon icon={Search} size="sm" tone="muted" />
                  </InputGroupAddon>
                  <InputGroupInput
                    autoFocus
                    value={filter}
                    placeholder={t("searchPlaceholder", {
                      count: dir.entries.length,
                    })}
                    aria-label={t("search")}
                    onChange={(e) => setFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && entries[0]) {
                        e.preventDefault();
                        goTo(childPath(entries[0].name));
                      } else if (e.key === "Escape" && filter) {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilter("");
                      }
                    }}
                  />
                </InputGroup>
                <Button
                  variant="outline"
                  size="sm"
                  icon={FolderPlus}
                  className="h-auto"
                  disabled={!dir.writable || newName !== null}
                  title={!dir.writable ? t("notWritable") : undefined}
                  onClick={() => {
                    create.reset();
                    setNewName("");
                  }}
                >
                  {t("newFolder")}
                </Button>
              </div>
              <div className="flex flex-col gap-0.5">
                {newName !== null ? (
                  <div className="flex flex-col gap-1 rounded-md bg-accent px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Icon icon={FolderPlus} size="sm" tone="primary" />
                      <Input
                        autoFocus
                        size="sm"
                        className="flex-1"
                        value={newName}
                        placeholder={t("newFolderPlaceholder")}
                        aria-label={t("newFolder")}
                        invalid={create.isError}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitNew();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setNewName(null);
                          }
                        }}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!newName.trim()}
                        loading={create.isPending}
                        onClick={submitNew}
                      >
                        {t("create")}
                      </Button>
                      <IconButton
                        icon={X}
                        size="icon-sm"
                        label={tc("cancel")}
                        tooltip={false}
                        onClick={() => setNewName(null)}
                      />
                    </div>
                    {create.isError ? (
                      <p className="m-0 pl-6 text-xs text-destructive">
                        {errorMessage(create.error)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {!dir.writable ? (
                  <p className="m-0 flex items-center gap-1.5 px-2 py-1 text-xs text-warning">
                    <Icon icon={TriangleAlert} size="xs" />
                    {t("notWritable")}
                  </p>
                ) : null}
                {dir.parent && !q ? (
                  <RowButton size="md" onClick={() => goTo(dir.parent!)}>
                    <Icon icon={ArrowUp} size="sm" tone="muted" />
                    {t("parentFolder")}
                  </RowButton>
                ) : null}
                {dir.entries.length === 0 ? (
                  <p className="m-0 px-2 py-1 text-xs text-muted-foreground">
                    {t("empty")}
                  </p>
                ) : entries.length === 0 ? (
                  <p className="m-0 px-2 py-1 text-xs text-muted-foreground">
                    {t("noMatch", { query: filter.trim() })}
                  </p>
                ) : (
                  entries.map((entry, i) => (
                    <RowButton
                      key={entry.name}
                      size="md"
                      className={i === 0 && q ? "bg-accent" : undefined}
                      onClick={() => goTo(childPath(entry.name))}
                    >
                      <Icon icon={Folder} size="sm" tone="muted" />
                      <span className="truncate">{entry.name}</span>
                    </RowButton>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            variant="primary"
            icon={Check}
            disabled={!dir}
            onClick={() => {
              if (!dir) return;
              onSelect(dir.path);
              onOpenChange(false);
            }}
          >
            {t("select")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
