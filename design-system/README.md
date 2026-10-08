# Spec Studio (quick-edit-nbl)

Workbench chạy local (Next.js) để quản lý và sửa các file spec `.md` cùng AI Agent (Direct API hoặc CLI như Claude Code / Aider), duyệt thay đổi bằng Diff Editor, rồi đồng bộ lên Google NotebookLM.

- Đặc tả kỹ thuật: [`docs/spec.md`](docs/spec.md)
- Design system: [`design/README.md`](design/README.md)

## Design system

| File | Dùng để |
| --- | --- |
| `design/tokens.json` | Nguồn gốc mọi token (màu light/dark, chữ, spacing, radius, shadow, size) |
| `design/globals.css` | Chép vào `app/globals.css` (Tailwind v4 + shadcn/ui): biến `--color-*`, dark mode bằng class `.dark`, motion, utility `press` / `icon-*` |
| `design/monaco-theme.ts` | Theme `spec-studio-light` / `spec-studio-dark` cho `@monaco-editor/react` (Editor + DiffEditor) |
| `design/components/*.md` | Quy tắc dùng từng component (Sidebar, DiffView, Select, Toast…) |
| `design/reference/` | Bản dựng tham chiếu của component (React UMD, không build) — để đối chiếu giao diện, không import vào app |
| `design/icons/` | Bộ icon Lucide đang dùng (ISC) |

Bộ màu: **blue** (`--color-primary`) + **gray**; đỏ chỉ cho lỗi/xoá, amber chỉ cho toast cảnh báo.
