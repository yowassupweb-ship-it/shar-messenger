# Chat backgrounds storage

Папки для SVG-фонов чата:
- `light/` — фоны для светлой темы
- `dark/` — фоны для тёмной темы

Важно:
- Для production используйте `SHAR_UPLOADS_DIR` на постоянном диске.
- Backend автоматически создаёт эти папки при старте в `<SHAR_UPLOADS_DIR>/chat-backgrounds/`.
