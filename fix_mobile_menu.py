#!/usr/bin/env python3
import re

file_path = r'd:\Desktop\shar-messenger\frontend\src\app\todos\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Найти и заменить мобильное меню
old_menu = r'''          {/* Mobile Filters Menu Button */}
          <div className="relative block md:hidden flex-shrink-0">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-\[20px\] transition-all duration-200 border border-white/20 shadow-\[inset_0_1px_2px_rgba\(255,255,255,0.3\),0_2px_6px_rgba\(0,0,0,0.1\)\] hover:shadow-\[inset_0_1px_2px_rgba\(255,255,255,0.4\),0_3px_8px_rgba\(0,0,0,0.15\)\] backdrop-blur-sm"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {mobileFiltersOpen && \(
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileFiltersOpen\(false\)} />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-\[#1a1a1a\] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="py-1">
                    {/\* Status Filter Section \*/}
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Статус</div>
                    {\[\{ value: 'all', label: 'Все статусы' \}, \{ value: 'todo', label: 'К выполнению' \}, \{ value: 'pending', label: 'В ожидании' \}, \{ value: 'in-progress', label: 'В работе' \}, \{ value: 'review', label: 'Готово к проверке' \}, \{ value: 'stuck', label: 'Застряла' \}\].map\(status => \(
                      <button
                        key={status.value}
                        onClick={() => \{ setFilterStatus\(status.value as any\); setMobileFiltersOpen\(false\); \}}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors \${
                          filterStatus === status.value ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        {status.label}
                      </button>
                    \)\)}
                    
                    {/\* Executor Filter Section \*/}
                    <div className="border-t border-gray-200 dark:border-white/10 my-1"></div>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Исполнитель</div>
                    <button
                      onClick={() => \{ setFilterExecutor\(null\); setMobileFiltersOpen\(false\); \}}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors \${
                        filterExecutor === null ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
                      }`}
                    >
                      Все исполнители
                    </button>
                    {people.map\(person => \(
                      <button
                        key={person.id}
                        onClick={() => \{ setFilterExecutor\(person.id\); setMobileFiltersOpen\(false\); \}}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors \${
                          filterExecutor === person.id ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        {person.name}
                      </button>
                    \)\)}
                    
                    {/\* Archive Toggle \*/}
                    <div className="border-t border-gray-200 dark:border-white/10 my-1"></div>
                    <button
                      onClick={() => \{ setShowArchive\(!showArchive\); setMobileFiltersOpen\(false\); \}}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 \${
                        showArchive ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
                      }`}
                    >
                      <Archive className="w-4 h-4" />
                      {showArchive ? 'Скрыть архив' : 'Показать архив'}
                    </button>
                    
                    {/\* Add List Button \*/}
                    <div className="border-t border-gray-200 dark:border-white/10 my-1"></div>
                    <button
                      onClick={() => \{ setShowAddList\(true\); setMobileFiltersOpen\(false\); \}}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 text-green-600 dark:text-green-400"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить список
                    </button>
                  </div>
                </div>
              </>
            \)}
          </div>'''

new_menu = '''          {/* Mobile Filters Menu - 3 отдельные кнопки */}
          <div className="flex gap-2 items-center md:hidden flex-shrink-0">
            <button
              onClick={() => setShowMobileFiltersModal(true)}
              className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm"
              title="Фильтры"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMobileArchiveModal(true)}
              className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 rounded-[20px] transition-all duration-200 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm"
              title="Архив"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAddList(true)}
              className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-green-500/30 to-green-500/10 hover:from-green-500/40 hover:to-green-500/20 rounded-[20px] transition-all duration-200 border border-green-500/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm"
              title="Новый список"
            >
              <Plus className="w-4 h-4 text-green-400" />
            </button>
          </div>'''

# Просто заменим в одну строку без regex
start_idx = content.find('{/* Mobile Filters Menu Button */}')
if start_idx > -1:
    end_idx = content.find('</div>\n\n          {/* Status Filter */', start_idx)
    if end_idx > -1:
        end_idx = content.find('\n', end_idx) + 1
        old_section = content[start_idx:end_idx]
        print(f"Found section of {len(old_section)} chars")
        content = content[:start_idx] + new_menu + '\n' + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
