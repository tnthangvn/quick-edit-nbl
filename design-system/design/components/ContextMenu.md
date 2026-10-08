# ContextMenu

Menu 3 chấm của một spec: Rename, Force Sync lên NotebookLM, Delete spec.

Mặc định dùng 3 mục trên; truyền `items` để thay. Mục phá huỷ đặt cuối, sau `divider`, `tone: 'destructive'`. Định vị (popover) do người dùng lo — trong app dùng Radix `DropdownMenu` và áp class `ss-menu`/token tương ứng.
