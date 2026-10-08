# Spec Studio — Wireframe

Bản wireframe tương tác của Spec Studio, dựng từ `docs/spec.md` và design system trong `design/`.

Xem và chạy thử (Play) trên canvas: https://claude.ai/artifact/DQUc79YboDCvbikkG4Nvkv

| File | Màn hình |
| --- | --- |
| `Main.dc.html` | 1 · Prototype luồng chính: tick spec → Send → Agent đọc & đề xuất → Diff → Approve & Save → đồng bộ NotebookLM |
| `Settings.dc.html` | 2 · Settings Dialog 3 tab (Direct API · CLI Agent Runner · NotebookLM Sync) |
| `CliMode.dc.html` | 3 · CLI Agent Mode: stream stdout của `claude` |
| `SpecMenu.dc.html` | 4 · Menu 3 chấm: Rename tại chỗ, Force Sync, Delete có xác nhận + Hoàn tác |
| `SyncStates.dc.html` | 5 · Badge trạng thái, pipeline sync (Drive / RPC), banner lỗi, toast |
| `Empty.dc.html` | 6 · Lần đầu mở app: chọn thư mục → kết nối Agent → NotebookLM |
| `Projects.dc.html` | 7 · Projects: danh sách Workspace (tìm, lọc Local/Git/Drive) + wizard New Project 4 bước: nơi lưu (Local / Git với GitHub·GitLab·Bitbucket·Gitea qua CLI `gh`/`glab`, MCP, Token, SSH / Drive), NotebookLM, tạo |

- `canvas.json`: vị trí các artboard trên canvas.
- `ds/spec-studio/`: bản sao token (`tokens.css`, `tokens.json`) và `components/bundle.css` mà các artboard dùng.

Các file `.dc.html` là định dạng Design Component của canvas (cần runtime `support.js` của canvas để chạy), dùng làm bản tham chiếu khi code giao diện thật bằng Next.js + shadcn/ui. Mọi class `ss-*` và biến `--color-*` khớp với `design/reference/bundle.css` và `design/globals.css`.
