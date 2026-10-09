"use client";

import { CircleCheck, Cloud, LogIn, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/client/api/useErrorMessage";
import { useGoogleOAuth } from "@/client/hooks/use-google-oauth";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Icon } from "@/ui/primitives/icon";
import { Spinner } from "@/ui/primitives/spinner";

/**
 * Settings › Integrations: kết nối nhanh Google Drive bằng OAuth (token dùng chung cả app).
 * Workspace Drive / NotebookLM Drive Sync chưa có token riêng sẽ dùng token này.
 */
export function GoogleDriveConnector() {
  const t = useTranslations("settings.integrations.google");
  const errorMessage = useErrorMessage();
  const google = useGoogleOAuth();

  const detail = google.isLoading
    ? t("checking")
    : !google.configured
      ? t("notConfigured")
      : google.connected
        ? t("connected")
        : t("notConnected");

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="m-0 text-sm leading-5 font-semibold">{t("title")}</h3>
        <p className="m-0 mt-0.5 text-xs leading-4 text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Icon icon={Cloud} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] leading-[18px] font-medium">Google Drive</div>
            <div className="truncate text-[11px] leading-4 text-muted-foreground">{detail}</div>
          </div>
          {google.isLoading ? (
            <Spinner size="sm" tone="muted" />
          ) : google.connected ? (
            <>
              <Badge size="sm" variant="primary">
                <CircleCheck />
                {t("badgeConnected")}
              </Badge>
              <Button variant="ghost" size="sm" icon={LogOut} loading={google.disconnecting} onClick={google.disconnect}>
                {t("signOut")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={LogIn}
              loading={google.connecting}
              loadingText={t("waiting")}
              disabled={!google.configured}
              onClick={() => void google.connect()}
            >
              {t("signIn")}
            </Button>
          )}
        </div>
        {google.error ? <p className="m-0 text-xs text-destructive">{errorMessage(google.error)}</p> : null}
      </div>
    </section>
  );
}
