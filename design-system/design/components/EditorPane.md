# EditorPane

Khung editor: tab bar tên file + trạng thái, thân là Monaco.

Preview chỉ MÔ PHỎNG Monaco bằng chính các token. Trong app, đặt `<Editor />` của `@monaco-editor/react` vào thân và đăng ký theme từ token (xem README chính, mục Monaco). Tab đang mở có vạch trên `color-primary`, chấm Unsaved khi chưa autosave.
