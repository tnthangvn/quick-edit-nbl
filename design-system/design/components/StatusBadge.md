# StatusBadge

Trạng thái đồng bộ của một spec với NotebookLM: `synced`, `unsaved`, `syncing`, `error`.

- Mỗi trạng thái có icon hoặc chấm riêng, không chỉ dựa vào màu: synced = dấu ✓ gray (`color-muted-foreground` trên `color-muted`, trạng thái yên, không cần chú ý), unsaved = chấm đặc blue (`color-primary`), syncing = spinner blue (`color-primary` trên `color-primary-soft`), error = vòng cảnh báo đỏ (`color-destructive`).
- `compact` trong Sidebar (chỉ icon, nhãn nằm ở `aria-label`), dạng đầy đủ trong tab editor và log chat.
- `label` để đổi chữ (ví dụ "Chờ duyệt").
