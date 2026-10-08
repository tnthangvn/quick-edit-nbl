"use client";

import * as React from "react";
import { ArrowUp, Check, CornerDownLeft, Folder, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBrowseDirectory } from "@/client/api/generated";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { cn } from "@/ui/utils";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Icon } from "@/ui/primitives/icon";
import { Input } from "@/ui/primitives/input";
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
 */
export function FolderBrowserDialog({ open, onOpenChange, initialPath, onSelect }: FolderBrowserDialogProps) {
  const t = useTranslations("filesystem.browser");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const [cursor, setCursor] = React.useState(initialPath);
  const [typed, setTyped] = React.useState("");
  // Mỗi lần dialog mở lại: quay về initialPath (xem https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCursor(initialPath);
      setTyped("");
    }
  }

  const browse = useBrowseDirectory(cursor ? { path: cursor } : undefined, { query: { enabled: open } });
  const dir = browse.data;

  const goTo = (path: string) => {
    setCursor(path);
    setTyped("");
  };

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
            <Input mono placeholder={t("pathPlaceholder")} value={typed || dir?.path || ""} onChange={(e) => setTyped(e.target.value)} />
            <Button type="submit" variant="outline" size="sm" icon={CornerDownLeft}>
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
            <div className="flex flex-col gap-0.5">
              {!dir.writable ? (
                <p className="m-0 flex items-center gap-1.5 px-2 py-1 text-xs text-warning">
                  <Icon icon={TriangleAlert} size="xs" />
                  {t("notWritable")}
                </p>
              ) : null}
              {dir.parent ? (
                <button
                  type="button"
                  onClick={() => goTo(dir.parent!)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Icon icon={ArrowUp} size="sm" tone="muted" />
                  {t("parentFolder")}
                </button>
              ) : null}
              {dir.entries.length === 0 ? (
                <p className="m-0 px-2 py-1 text-xs text-muted-foreground">{t("empty")}</p>
              ) : (
                dir.entries.map((entry) => {
                  const childPath = `${dir.path.replace(/\/$/, "")}/${entry.name}`;
                  return (
                    <button
                      key={entry.name}
                      type="button"
                      onClick={() => goTo(childPath)}
                      className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent")}
                    >
                      <Icon icon={Folder} size="sm" tone="muted" />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  );
                })
              )}
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
