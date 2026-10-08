"use client";

import * as React from "react";
import { Download, TriangleAlert, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { exportSettings, useImportSettings } from "@/client/api/generated";
import type { ExportedSettings } from "@/client/api/generated/model";
import { ImportSettingsBody } from "@/client/api/generated/zod/setting/setting.zod";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Icon } from "@/ui/primitives/icon";
import { notify } from "@/ui/primitives/sonner";

/** Settings › Export/Import (không nằm trong form Save chung — thao tác ngay, giống tab Integrations). */
export function ExportImportTab() {
  const t = useTranslations("settings.exportImport");
  const errorMessage = useErrorMessage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = React.useState(false);
  const [pending, setPending] = React.useState<ExportedSettings | null>(null);

  const download = async () => {
    setExporting(true);
    try {
      const data = await exportSettings();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = t("exportedFileName");
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const pickFile = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      notify.error(t("invalidFile"));
      return;
    }
    const parsed = ImportSettingsBody.safeParse(json);
    if (!parsed.success) {
      notify.error(t("invalidFile"));
      return;
    }
    setPending(parsed.data);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-sm text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" icon={Download} loading={exporting} onClick={() => void download()}>
          {t("exportButton")}
        </Button>
        <Button variant="outline" icon={Upload} onClick={pickFile}>
          {t("importButton")}
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => void onFileSelected(e)} />
      </div>
      <ImportConfirmDialog data={pending} onOpenChange={(open) => !open && setPending(null)} />
    </div>
  );
}

function ImportConfirmDialog({ data, onOpenChange }: { data: ExportedSettings | null; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("settings.exportImport");
  const tc = useTranslations("common.actions");
  const errorMessage = useErrorMessage();
  const importSettings = useImportSettings({
    mutation: {
      onSuccess: (r) => {
        onOpenChange(false);
        notify.info(t("importSuccess", { imported: r.importedConnectors }));
        if (r.skippedConnectors.length > 0) notify.info(t("importSkipped", { count: r.skippedConnectors.length, names: r.skippedConnectors.join(", ") }));
      },
      onError: (err) => notify.error(t("importFailed"), { description: errorMessage(err) }),
    },
  });

  return (
    <Dialog open={data !== null} onOpenChange={(open) => !importSettings.isPending && onOpenChange(open)}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("importConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("importConfirmDescription")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="py-3">
          <p className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon icon={TriangleAlert} size="xs" />
            {data?.connectors.length ?? 0} connector · {data?.exportedAt}
          </p>
        </DialogBody>
        <DialogFooter className="justify-end">
          <Button variant="ghost" disabled={importSettings.isPending} onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="primary" loading={importSettings.isPending} onClick={() => data && importSettings.mutate({ data })}>
            {t("importButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
