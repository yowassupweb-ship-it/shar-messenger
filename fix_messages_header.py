#!/usr/bin/env python3

file_path = r'd:\Desktop\shar-messenger\frontend\src\app\messages\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Замена 1: Класс контейнера
old1 = '        ) : (\n          <div className="px-2 py-1.5 md:p-3 border-b border-white/10 flex-shrink-0">\n            <div className="relative flex-1">'
new1 = '        ) : (\n          <div className="px-2 py-1.5 md:p-3 border-b border-white/10 flex-shrink-0 flex items-center gap-2">\n            <div className="relative flex-1 md:flex-none">'

content = content.replace(old1, new1)

# Замена 2: Добавить + кнопку
old2 = '              />\n            </div>\n          </div>\n        )}\n\n        {/* Chats list */}'
new2 = '              />\n            </div>\n            {/* + кнопка */}\n            <button\n              onClick={() => setShowNewChatModal(true)}\n              className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 flex items-center justify-center transition-all border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm"\n              title="Новый чат"\n            >\n              <Plus className="w-4 h-4" />\n            </button>\n          </div>\n        )}\n\n        {/* Chats list */}'

content = content.replace(old2, new2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed messages header!")
