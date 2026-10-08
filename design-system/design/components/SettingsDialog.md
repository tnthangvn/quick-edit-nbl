# SettingsDialog

Modal cấu hình 3 tab: Direct API, CLI Agent Runner, NotebookLM Sync.

Rộng 560px, bo `radius-xl`, `shadow-dialog`. Footer luôn hiện đường dẫn `.spec-studio/config.json` + Cancel / Save. Field nhạy cảm (API key, cookie) dùng `type="password"` và ghi chú "chỉ lưu local". Trong app dùng Radix `Dialog` + `Tabs`.

**Chiều cao cố định:** dialog nhiều tab hoặc nhiều bước (Settings, New Project) có chiều cao cố định (Settings 640px, New Project 660px; tối đa `100vh - 48px`). Header, thanh tab/stepper và footer đứng yên; chỉ vùng nội dung cuộn (`overflow-y: auto`, `scrollbar-gutter: stable` để không xô lệch khi thanh cuộn xuất hiện). Đổi tab hay bước không làm dialog co giãn hay nhảy vị trí; dialog căn giữa màn hình.
