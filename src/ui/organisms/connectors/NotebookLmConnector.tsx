"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, CircleCheck, LogOut, RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getGetNotebookConnectionQueryKey,
  useCheckNotebookConnection,
  useDeleteNotebookConnection,
  useGetNotebookConnection,
  useSaveNotebookConnection,
} from "@/client/api/generated";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { notify } from "@/ui/primitives/sonner";
import { Spinner } from "@/ui/primitives/spinner";
import { Textarea } from "@/ui/primitives/textarea";

/**
 * Settings › Integrations: kết nối NotebookLM bằng cookie đăng nhập Google (dán từ DevTools), dùng chung cho mọi project.
 * App gọi thẳng API nội bộ của NotebookLM (không qua CLI). Cookie được kiểm tra trước khi lưu, lưu mã hoá, chỉ hiện bản che.
 */
export function NotebookLmConnector() {
  const t = useTranslations("settings.integrations.notebooklm");
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const status = useGetNotebookConnection();
  const [cookie, setCookie] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetNotebookConnectionQueryKey() });

  const save = useSaveNotebookConnection({
    mutation: {
      onSuccess: (r) => {
        setCookie("");
        setEditing(false);
        void invalidate();
        notify.info(t("saved", { count: r.notebookCount }));
      },
      onError: (err) => notify.error(t("saveFailed"), { description: errorMessage(err) }),
    },
  });
  const check = useCheckNotebookConnection({
    mutation: {
      onSuccess: (r) => notify.info(t("checkOk", { count: r.notebookCount })),
      onError: (err) => notify.error(t("checkFailed"), { description: errorMessage(err) }),
    },
  });
  const remove = useDeleteNotebookConnection({
    mutation: {
      onSuccess: () => {
        void invalidate();
        notify.info(t("removed"));
      },
      onError: (err) => notify.error(errorMessage(err)),
    },
  });

  const connected = status.data?.isSet ?? false;
  const showForm = !connected || editing;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="m-0 text-sm leading-5 font-semibold">{t("title")}</h3>
        <p className="m-0 mt-0.5 text-xs leading-4 text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Icon icon={BookOpen} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] leading-[18px] font-medium">NotebookLM</div>
            <div className="truncate font-mono text-[11px] leading-4 text-muted-foreground">
              {status.isPending ? t("checking") : connected ? status.data?.masked : t("notConnected")}
            </div>
          </div>
          {status.isPending ? (
            <Spinner size="sm" tone="muted" />
          ) : connected ? (
            <>
              <Badge size="sm" variant="primary">
                <CircleCheck />
                {t("connected")}
              </Badge>
              <Button variant="ghost" size="sm" icon={RefreshCw} loading={check.isPending} onClick={() => check.mutate()}>
                {t("check")}
              </Button>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  {t("replace")}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" icon={LogOut} loading={remove.isPending} onClick={() => remove.mutate()}>
                {t("disconnect")}
              </Button>
            </>
          ) : null}
        </div>
        {showForm ? (
          <div className="flex flex-col gap-2">
            <ol className="m-0 flex flex-col gap-0.5 pl-4 text-xs leading-[18px] text-muted-foreground">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
            </ol>
            <Textarea
              mono
              rows={3}
              autoComplete="off"
              spellCheck={false}
              placeholder="SID=…; HSID=…; SSID=…; APISID=…; SAPISID=…; __Secure-1PSID=…"
              value={cookie}
              aria-label={t("cookieLabel")}
              onChange={(e) => setCookie(e.target.value)}
            />
            <p className="m-0 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
              <Icon icon={TriangleAlert} size="xs" tone="muted" className="mt-px" />
              {t("warning")}
            </p>
            <div className="flex justify-end gap-2">
              {editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  {t("cancel")}
                </Button>
              ) : null}
              <Button variant="primary" size="sm" disabled={cookie.trim().length < 20} loading={save.isPending} loadingText={t("saving")} onClick={() => save.mutate({ data: { cookie } })}>
                {t("save")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
