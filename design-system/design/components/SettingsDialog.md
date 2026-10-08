# SettingsDialog

Modal cấu hình 3 tab: Direct API, CLI Agent Runner, NotebookLM Sync.

Rộng 560px, bo `radius-xl`, `shadow-dialog`. Footer luôn hiện đường dẫn `.spec-studio/config.json` + Cancel / Save. Field nhạy cảm (API key, cookie) dùng `type="password"` và ghi chú "chỉ lưu local". Trong app dùng Radix `Dialog` + `Tabs`.
