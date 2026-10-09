"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGoogleOAuthStatusQueryKey,
  getGoogleOAuthStatus,
  startGoogleOAuth,
  useDisconnectGoogleOAuth,
  useGetGoogleOAuthStatus,
} from "@/client/api/generated";

const POLL_MS = 1500;
const TIMEOUT_MS = 5 * 60_000;

/**
 * Đăng nhập Google (Drive / NotebookLM Drive Sync): mở popup tới `authUrl` của `startGoogleOAuth`,
 * hỏi `getGoogleOAuthStatus` mỗi 1.5s tới khi `connected` hoặc popup bị đóng / quá 5 phút.
 * Popup được mở ngay trong sự kiện click (tránh bị chặn) rồi mới gán URL.
 * `disconnect` xoá refresh token (của Workspace nếu có workspaceId, ngược lại token dùng chung).
 */
export function useGoogleOAuth(workspaceId?: string) {
  const params = workspaceId ? { workspaceId } : undefined;
  const queryClient = useQueryClient();
  const status = useGetGoogleOAuthStatus(params);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupRef = useRef<Window | null>(null);
  const disconnectMutation = useDisconnectGoogleOAuth({
    mutation: {
      onSuccess: (next) => queryClient.setQueryData(getGetGoogleOAuthStatusQueryKey(params), next),
      onError: (err) => setError(err),
    },
  });

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setConnecting(false);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const popup = window.open("about:blank", "spec-studio-google-oauth", "width=520,height=680");
    popupRef.current = popup;
    setConnecting(true);
    try {
      const { authUrl } = await startGoogleOAuth(params);
      if (popup) popup.location.href = authUrl;
      else window.open(authUrl, "_blank", "noopener");
    } catch (err) {
      popup?.close();
      setError(err);
      stop();
      return;
    }
    const startedAt = Date.now();
    const key = getGetGoogleOAuthStatusQueryKey(params);
    timer.current = setInterval(async () => {
      try {
        const next = await getGoogleOAuthStatus(params);
        if (next.connected) {
          queryClient.setQueryData(key, next);
          popupRef.current?.close();
          stop();
          return;
        }
      } catch {
        // Bỏ qua lỗi tạm thời, hỏi lại ở lần sau.
      }
      if (popupRef.current?.closed || Date.now() - startedAt > TIMEOUT_MS) {
        stop();
        void queryClient.invalidateQueries({ queryKey: key });
      }
    }, POLL_MS);
    // params là object mới mỗi render; workspaceId là đủ để xác định.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, queryClient, stop]);

  const disconnect = useCallback(() => {
    setError(null);
    disconnectMutation.mutate({ params });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, disconnectMutation.mutate]);

  return {
    configured: status.data?.configured ?? false,
    connected: status.data?.connected ?? false,
    isLoading: status.isLoading,
    statusError: status.error,
    connecting,
    error,
    connect,
    disconnecting: disconnectMutation.isPending,
    disconnect,
  };
}
