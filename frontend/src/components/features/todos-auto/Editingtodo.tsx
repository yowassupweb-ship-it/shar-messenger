'use client';

import React, { memo, useRef, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  CalendarPlus, 
  Check, 
  ChevronDown, 
  Inbox,
  Link2,
  MessageCircle,
  Plus, 
  Tag,
  X 
} from 'lucide-react';
import StatusButtonGroup, { StatusOption } from '@/components/forms/ui/StatusButtonGroup';
import PersonSelector from '@/components/forms/ui/PersonSelector';
import MultiPersonSelector from '@/components/forms/ui/MultiPersonSelector';
import DateTimePicker from '@/components/forms/ui/DateTimePicker';
import TextArea from '@/components/forms/ui/TextArea';
import FormField from '@/components/forms/ui/FormField';

// Типы (должны быть импортированы из parent или shared types)
interface Person {
  id: string;
  name: string;
  username?: string;
  telegramId?: string;
  role: 'executor' | 'customer' | 'universal';
}

interface TodoList {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  archived?: boolean;
}

interface TodoCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

interface CalendarList {
  id: string;
  name: string;
  color?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
  size?: number;
  uploadedAt: string;
}

interface Comment {
  id: string;
  todoId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'pending' | 'review' | 'cancelled' | 'stuck';
  reviewComment?: string;
  dueDate?: string;
  listId: string;
  categoryId?: string;
  tags: string[];
  assignedById?: string | null;
  assignedBy?: string | null;
  delegatedById?: string | null;
  delegatedBy?: string | null;
  assignedToId?: string | null;
  assignedTo?: string | null;
  assignedToIds?: string[];
  assignedToNames?: string[];
  addToCalendar?: boolean;
  calendarEventId?: string;
  calendarListId?: string;
  chatId?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  archived?: boolean;
  comments?: Comment[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
}

interface EditingtodoProps {
  // Основные данные
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
  
  // Данные
  people: Person[];
  lists: TodoList[];
  nonArchivedLists: TodoList[];
  categories: TodoCategory[];
  calendarLists: CalendarList[];
  
  // UI состояние
  openDropdown: string | null;
  setOpenDropdown: (dropdown: string | null) => void;
  
  // Layout состояние (для resize колонок)
  columnWidths: [number, number, number];
  setColumnWidths: Dispatch<SetStateAction<[number, number, number]>>;
  isResizing: number | null;
  setIsResizing: Dispatch<SetStateAction<number | null>>;
  resizeStartXRef: React.MutableRefObject<number>;
  resizeStartWidthsRef: React.MutableRefObject<number[]>;
  
  // Константы
  statusOptions: StatusOption[];
  TZ_LIST_ID: string;
  myAccountId: string;
}

const Editingtodo = memo(function Editingtodo({
  todo,
  isOpen,
  onClose,
  onUpdate,
  onToggle,
  people,
  lists,
  nonArchivedLists,
  categories,
  calendarLists,
  openDropdown,
  setOpenDropdown,
  columnWidths,
  setColumnWidths,
  isResizing,
  setIsResizing,
  resizeStartXRef,
  resizeStartWidthsRef,
  statusOptions,
  TZ_LIST_ID,
  myAccountId
}: EditingtodoProps) {
  const router = useRouter();
  
  // Локальное состояние для редактирования
  const [editingTodo, setEditingTodo] = useState<Todo | null>(todo);
  
  // Синхронизируем локальное состояние с входящим todo
  useEffect(() => {
    setEditingTodo(todo);
  }, [todo]);
  
  // Refs для DOM элементов
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  
  // Обработчик обновления полей
  const handleUpdate = (updates: Partial<Todo>) => {
    if (!editingTodo) return;
    setEditingTodo({ ...editingTodo, ...updates });
  };
  
  // Обработчик сохранения
  const updateTodo = (updatedTodo: Todo) => {
    onUpdate(updatedTodo);
    onClose();
  };
  
  const closeTodoModal = () => {
    onClose();
  };
  
  const toggleTodo = (todo: Todo) => {
    onToggle(todo);
  };
  
  if (!isOpen || !editingTodo) return null;
  
  return (
        <div className="fixed inset-0 bg-black flex items-start justify-center z-[100]">
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#151515] w-full h-screen flex flex-col overflow-hidden select-none">
            {/* Шапка */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 md:border-b border-gray-200 dark:border-[var(--border-color)] bg-gray-50 dark:bg-white/[0.02] flex-shrink-0 select-none">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Кнопка выполнения в шапке - хорошо видна */}
                <button
                  onClick={() => {
                    const newCompleted = !editingTodo.completed;
                    setEditingTodo({ ...editingTodo, completed: newCompleted });
                    toggleTodo(editingTodo);
                  }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-[background-color,color] select-none ${
                    editingTodo.completed
                      ? 'bg-green-500/30 text-green-300 ring-1 ring-green-500/50 hover:bg-green-500/40'
                      : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:bg-green-500/20 hover:text-green-400 ring-1 ring-white/10'
                  }`}
                  title={editingTodo.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
                >
                  <Check className={`w-4 h-4 ${editingTodo.completed ? 'text-green-300' : ''}`} />
                  {editingTodo.completed ? 'Выполнено' : 'Выполнить'}
                </button>
              </div>
              <button
                onClick={closeTodoModal}
                className="w-8 h-8 bg-gray-100 dark:bg-[var(--bg-glass)] hover:bg-gray-200 dark:hover:bg-[var(--bg-glass-hover)] rounded-full transition-colors flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-[var(--border-glass)] backdrop-blur-sm"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-[var(--text-secondary)]" />
              </button>
            </div>
            
            {/* Три колонки - адаптивно с регулируемой шириной */}
            <div 
              className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden relative"
              style={{
                '--col-left': `${columnWidths[0]}%`,
                '--col-center': `${columnWidths[1]}%`,
                '--col-right': `${columnWidths[2]}%`,
                contain: 'layout style' // 🚀 Изолируем reflow
              } as React.CSSProperties}
            >
              {/* Левый блок - основные поля */}
              <div 
                className="w-full lg:w-[var(--col-left)] border-b-0 lg:border-b-0 lg:border-r border-gray-200 dark:border-[var(--border-color)] flex-shrink-0 bg-gray-50 dark:bg-[var(--bg-secondary)] order-2 lg:order-1 overflow-y-auto min-h-0 min-w-0 transition-[width] duration-100"
              >
                <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                {/* Статус */}
                <FormField label="Статус">
                  <StatusButtonGroup
                    value={editingTodo.status || 'pending'}
                    options={statusOptions}
                    onChange={(status) => handleUpdate({ status: status as Todo['status'] })}
                  />
                  {editingTodo.status === 'review' && (
                    <div className="mt-2">
                      <TextArea
                        value={editingTodo.reviewComment}
                        onChange={(reviewComment) => handleUpdate({ reviewComment })}
                        placeholder="Комментарий или замечания..."
                        rows={2}
                      />
                    </div>
                  )}
                </FormField>
              
                {/* Заказчик и Исполнитель */}
                <div className="space-y-2">
                  {/* От кого и Делегировано */}
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="От кого">
                      <PersonSelector
                        selectedId={editingTodo.assignedById}
                        selectedName={editingTodo.assignedBy}
                        people={people.filter(p => p.role === 'customer' || p.role === 'universal')}
                        placeholder="Не выбран"
                        onChange={(id, name) => handleUpdate({ assignedById: id, assignedBy: name })}
                      />
                    </FormField>
                    <FormField label="Делегировано">
                      <PersonSelector
                        selectedId={editingTodo.delegatedById}
                        selectedName={editingTodo.delegatedBy}
                        people={people.filter(p => p.role === 'customer' || p.role === 'universal')}
                        placeholder="Не выбран"
                        onChange={(id, name) => handleUpdate({ delegatedById: id, delegatedBy: name })}
                      />
                    </FormField>
                  </div>
                  
                  {/* Исполнители - отдельная строка */}
                  <FormField label="Исполнители">
                    <MultiPersonSelector
                      selectedIds={editingTodo.assignedToIds || (editingTodo.assignedToId ? [editingTodo.assignedToId] : [])}
                      selectedNames={editingTodo.assignedToNames || (editingTodo.assignedTo ? [editingTodo.assignedTo] : [])}
                      people={people.filter(p => p.role === 'executor' || p.role === 'universal')}
                      placeholder="Выберите исполнителей"
                      onChange={(ids, names) => handleUpdate({ 
                        assignedToIds: ids.length > 0 ? ids : undefined,
                        assignedToNames: names.length > 0 ? names : undefined,
                        assignedToId: ids[0] || undefined,
                        assignedTo: names[0] || ''
                      })}
                    />
                  </FormField>
                </div>
              
                {/* Приоритет и Срок */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">Приоритет</label>
                    <div className="flex gap-1.5">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleUpdate({ priority: p })}
                          className={`flex-shrink-0 w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                            editingTodo.priority === p
                              ? p === 'high' 
                                ? 'bg-red-500/20 ring-1 ring-red-500'
                                : p === 'medium'
                                  ? 'bg-yellow-500/20 ring-1 ring-yellow-500'
                                  : 'bg-green-500/20 ring-1 ring-green-500'
                              : 'hover:bg-[var(--bg-glass)]'
                          }`}
                          title={p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                        >
                          <span className={`flex-shrink-0 w-3 h-3 rounded-full ${
                            p === 'high' 
                              ? 'bg-red-500' 
                              : p === 'medium' 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <FormField label="Срок">
                    <DateTimePicker
                      value={editingTodo.dueDate}
                      onChange={(dueDate) => handleUpdate({ dueDate })}
                      placeholder="Выберите срок"
                    />
                  </FormField>
                </div>
              
                {/* Список и Категория */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1 select-none">
                      <Inbox className="w-2.5 h-2.5" />
                      Список
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'list' ? null : 'list')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
                      style={{ borderRadius: '35px', transform: 'translateZ(0)' }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {(() => {
                          const list = lists.find(l => l.id === editingTodo.listId);
                          return list ? (
                            <>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                              <span className="text-[var(--text-primary)] text-xs truncate whitespace-nowrap">{list.name}</span>
                            </>
                          ) : <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">Выберите список</span>;
                        })()}
                      </div>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'list' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'list' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto backdrop-blur-xl">
                        {nonArchivedLists.map(list => (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => {
                              setEditingTodo({ ...editingTodo, listId: list.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center gap-1.5 ${
                              editingTodo.listId === list.id ? 'bg-[var(--bg-glass)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                            <span>{list.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1 select-none">
                      <Tag className="w-2.5 h-2.5" />
                      Категория
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                      className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
                      style={{ borderRadius: '35px', transform: 'translateZ(0)' }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {(() => {
                          const cat = categories.find(c => c.id === editingTodo.categoryId);
                          return cat ? (
                            <>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-[var(--text-primary)] text-xs truncate whitespace-nowrap">{cat.name}</span>
                            </>
                          ) : <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">Без категории</span>;
                        })()}
                      </div>
                      <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'category' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTodo({ ...editingTodo, categoryId: undefined });
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors text-xs ${
                            !editingTodo.categoryId ? 'bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-900 dark:text-[var(--text-primary)]' : 'text-gray-500 dark:text-white/50'
                          }`}
                        >
                          Без категории
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setEditingTodo({ ...editingTodo, categoryId: cat.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-[var(--bg-glass)] transition-colors text-xs flex items-center gap-1.5 ${
                              editingTodo.categoryId === cat.id ? 'bg-[var(--bg-glass)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>



                {/* Поместить на календарь */}
                <div className="mt-2">
                  <label 
                    className="flex items-center gap-2 cursor-pointer group select-none"
                    onClick={() => setEditingTodo({ ...editingTodo, addToCalendar: !editingTodo.addToCalendar })}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      editingTodo.addToCalendar 
                        ? 'bg-purple-500 border-purple-500' 
                        : 'border-[var(--border-light)] group-hover:border-white/40'
                    }`}>
                      {editingTodo.addToCalendar && <Check className="w-3 h-3 text-[var(--text-primary)]" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarPlus className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                        Поместить на календарь
                      </span>
                      {editingTodo.listId === TZ_LIST_ID && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          как ТЗ
                        </span>
                      )}
                    </div>
                  </label>
                  {editingTodo.addToCalendar && (
                    <div className="mt-2 ml-7">
                      <label className="text-[10px] text-[var(--text-muted)] mb-1 block select-none">Календарь</label>
                      {calendarLists.length === 0 ? (
                        <p className="text-[10px] text-[var(--text-muted)] italic">Нет доступных календарей</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {calendarLists.map(list => (
                            <button
                              key={list.id}
                              type="button"
                              onClick={() => setEditingTodo({ ...editingTodo, calendarListId: list.id })}
                              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none whitespace-nowrap ${
                                editingTodo.calendarListId === list.id || (!editingTodo.calendarListId && list.id === calendarLists[0]?.id)
                                  ? 'bg-purple-500 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                                  : 'bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-[var(--text-secondary)] hover:border-purple-500/30'
                              }`}
                              title={list.name}
                            >
                              {list.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {editingTodo.calendarEventId && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-400">
                      <Check className="w-3 h-3" />
                      <span>Уже добавлено на календарь</span>
                      <a 
                        href="http://117.117.117.235:3000/events" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 ml-1"
                      >
                        Открыть →
                      </a>
                    </div>
                  )}
                </div>
              </div>
              </div>

              {/* Resize handle between left and center */}
              <div 
                className="hidden lg:block w-1 cursor-col-resize bg-transparent hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors relative z-10 flex-shrink-0 group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  resizeStartXRef.current = e.clientX;
                  resizeStartWidthsRef.current = columnWidths;
                  setIsResizing(0);
                }}
                title="Перетащите для изменения ширины"
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center">
                  <div className="w-0.5 h-6 bg-gray-300 dark:bg-white/20 group-hover:bg-blue-500 transition-colors rounded-full"></div>
                </div>
              </div>

              {/* Средний блок - Название и Описание */}
              <div 
                className="w-full lg:w-[var(--col-center)] flex flex-col bg-white dark:bg-[var(--bg-secondary)] border-b-0 lg:border-b-0 lg:border-r border-gray-200 dark:border-[var(--border-color)] order-1 lg:order-2 overflow-y-auto min-h-0 min-w-0 transition-[width] duration-100"
              >
                {/* Название задачи */}
                <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTodo.title || ''}
                    onChange={(e) => handleUpdate({ title: e.target.value })}
                    className="no-mobile-scale w-full px-2 sm:px-3 py-3 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-lg sm:text-xl font-semibold focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
                    placeholder="Название задачи..."
                  />
                </div>
                
                {/* Заголовок с кнопками форматирования */}
                <div className="px-2 sm:px-3 py-1 sm:py-1.5 md:border-b border-gray-200 dark:border-[var(--border-color)]">
                  {/* Панель форматирования - компактная */}
                  <div className="flex items-center justify-center sm:justify-start gap-0.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('bold', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Жирный (Ctrl+B)"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('italic', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Курсив (Ctrl+I)"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('underline', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Подчёркнутый (Ctrl+U)"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          document.execCommand('strikeThrough', false);
                          editor.focus();
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Зачёркнутый"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
                    </button>
                    <div className="w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    <button
                      type="button"
                      onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          const editor = document.getElementById('description-editor');
                          if (editor && selectedText) {
                            const items = selectedText.split('\n').filter(s => s.trim());
                            const ul = `<ul class="list-disc ml-6 my-2">${items.map(item => `<li class="text-gray-900 dark:text-white">${item.trim()}</li>`).join('')}</ul>`;
                            range.deleteContents();
                            const template = document.createElement('template');
                            template.innerHTML = ul;
                            range.insertNode(template.content.firstChild!);
                            editor.focus();
                            if (editingTodo && descriptionEditorRef.current) {
                              setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                            }
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Маркированный список"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          const editor = document.getElementById('description-editor');
                          if (editor && selectedText) {
                            const items = selectedText.split('\n').filter(s => s.trim());
                            const ol = `<ol class="list-decimal ml-6 my-2">${items.map(item => `<li class="text-gray-900 dark:text-white">${item.trim()}</li>`).join('')}</ol>`;
                            range.deleteContents();
                            const template = document.createElement('template');
                            template.innerHTML = ol;
                            range.insertNode(template.content.firstChild!);
                            editor.focus();
                            if (editingTodo && descriptionEditorRef.current) {
                              setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                            }
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Нумерованный список"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
                    </button>
                    <div className="hidden sm:block w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    {/* Кастомный dropdown для размера текста */}
                    <div className="relative hidden sm:block">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'textSize' ? null : 'textSize')}
                        className="flex items-center gap-1 px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors text-xs will-change-transform"
                        style={{ transform: 'translateZ(0)' }}
                      >
                        <svg className="w-5 h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>
                        <span className="hidden sm:inline text-[10px]">Размер</span>
                        <ChevronDown className="w-2 h-2" />
                      </button>
                      {openDropdown === 'textSize' && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-xl z-50 min-w-[120px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const h1 = `<h1 class="text-2xl font-bold my-2 text-gray-900 dark:text-white">${selectedText}</h1>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h1;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-base font-bold text-gray-900 dark:text-[var(--text-primary)]">Заголовок 1</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const h2 = `<h2 class="text-xl font-semibold my-2 text-gray-900 dark:text-white">${selectedText}</h2>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h2;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-sm font-semibold text-gray-900 dark:text-[var(--text-primary)]">Заголовок 2</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const h3 = `<h3 class="text-lg font-medium my-2 text-gray-900 dark:text-white">${selectedText}</h3>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h3;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-xs font-medium text-gray-900 dark:text-[var(--text-primary)]">Заголовок 3</span>
                          </button>
                          <div className="h-px bg-gray-200 dark:bg-[var(--bg-glass-hover)] my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const span = `<span class="text-sm text-gray-900 dark:text-white">${selectedText}</span>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = span;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-xs text-gray-600 dark:text-[var(--text-secondary)]">Обычный текст</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block w-px h-3 bg-gray-200 dark:bg-[var(--bg-glass-hover)] mx-0.5" />
                    <button
                      type="button"
                      onClick={() => {
                        const selection = window.getSelection();
                        const editor = document.getElementById('description-editor');
                        if (!selection || !editor) return;
                        
                        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                        const selectedText = selection.toString();
                        
                        const url = prompt('Введите URL ссылки:', 'https://');
                        if (url && url.trim() && range) {
                          const linkText = selectedText || url;
                          const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" contenteditable="false" class="text-blue-500 hover:text-blue-600 underline cursor-pointer">${linkText}</a>`;
                          
                          range.deleteContents();
                          const template = document.createElement('template');
                          template.innerHTML = linkHTML;
                          range.insertNode(template.content.firstChild!);
                          
                          editor.focus();
                          // Сохраняем изменения
                          if (editingTodo && descriptionEditorRef.current) {
                            setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Вставить ссылку"
                    >
                      <Link2 className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const editor = document.getElementById('description-editor');
                        if (editor) {
                          // Вставляем чек-лист
                          const checkbox = '<div class="checklist-item flex items-center gap-2 my-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"><input type="checkbox" data-checklist="true" class="w-4 h-4 rounded border-2 border-gray-300 dark:border-white/30 cursor-pointer accent-blue-500" /><span contenteditable="true" class="flex-1 text-gray-900 dark:text-white outline-none">Пункт чек-листа</span></div>';
                          document.execCommand('insertHTML', false, checkbox);
                          editor.focus();
                        }
                      }}
                      className="hidden sm:block p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Добавить чек-лист"
                    >
                      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          const selectedText = range.toString();
                          const editor = document.getElementById('description-editor');
                          if (editor && selectedText) {
                            // Заменяем выделенное на простой текст без форматирования
                            const plainText = document.createTextNode(selectedText);
                            range.deleteContents();
                            range.insertNode(plainText);
                            editor.focus();
                            // Сохраняем изменения
                            if (editingTodo && descriptionEditorRef.current) {
                              setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                            }
                          }
                        }
                      }}
                      className="p-1.5 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] rounded text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-[var(--text-primary)] transition-colors"
                      title="Очистить форматирование"
                    >
                      <X className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Редактор описания - увеличенный с drag & drop */}
                <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 overflow-y-auto flex flex-col relative min-h-[200px]">
                  {/* Превью загруженных изображений - Telegram-style grid */}
                  {editingTodo.attachments && editingTodo.attachments.filter(a => a.type === 'image').length > 0 && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 w-full">
                      {(() => {
                        const images = editingTodo.attachments?.filter(a => a.type === 'image') || [];
                        const count = Math.min(images.length, 6);
                        
                        if (count === 1) {
                          return (
                            <div className="relative group w-full">
                              <img src={images[0].url} alt="" className="w-full max-h-[180px] object-cover block" />
                              <button type="button" onClick={() => setEditingTodo(prev => prev ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== images[0].id) } : null)} className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4 text-white" /></button>
                            </div>
                          );
                        }
                        
                        if (count === 2) {
                          return (
                            <div className="grid grid-cols-2 gap-0.5 w-full">
                              {images.slice(0, 2).map((img, idx) => (
                                <div key={img.id} className="relative group w-full">
                                  <img src={img.url} alt="" className="w-full h-[100px] object-cover block" />
                                  <button type="button" onClick={() => setEditingTodo(prev => prev ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== img.id) } : null)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        // 3+ images - grid layout
                        return (
                          <div className="grid grid-cols-3 gap-0.5 w-full">
                            {images.slice(0, 6).map((img, idx) => (
                              <div key={img.id} className="relative group w-full">
                                <img src={img.url} alt="" className="w-full h-[70px] object-cover block" />
                                <button type="button" onClick={() => setEditingTodo(prev => prev ? { ...prev, attachments: prev.attachments?.filter(a => a.id !== img.id) } : null)} className="absolute top-1 right-1 w-4 h-4 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-2.5 h-2.5 text-white" /></button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {(editingTodo.attachments?.filter(a => a.type === 'image').length || 0) > 6 && (
                        <div className="text-center text-xs text-gray-500 dark:text-white/40 py-1 bg-gray-100 dark:bg-white/5">
                          +{(editingTodo.attachments?.filter(a => a.type === 'image').length || 0) - 6} ещё
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div
                    ref={descriptionEditorRef}
                    id="description-editor"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                      // 🚀 ULTRA PERFORMANCE: НЕ вызываем setState - НИКАКОГО re-render!
                      // description живет только в DOM, сохраняется при закрытии модалки
                      // Это полностью убирает Input Delay 160-191ms
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      
                      // Ctrl + клик по ссылке = переход
                      if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        const link = target as HTMLAnchorElement;
                        if (link.href) {
                          window.open(link.href, '_blank', 'noopener,noreferrer');
                        }
                        return;
                      }
                      
                      // Обработка кликов по чекбоксам чек-листа
                      if (target.tagName === 'INPUT' && target.getAttribute('data-checklist') === 'true') {
                        const checkbox = target as HTMLInputElement;
                        const parent = checkbox.parentElement;
                        if (parent) {
                          if (checkbox.checked) {
                            parent.style.opacity = '0.5';
                            parent.style.textDecoration = 'line-through';
                          } else {
                            parent.style.opacity = '1';
                            parent.style.textDecoration = 'none';
                          }
                          // Сохраняем изменения
                          if (editingTodo && descriptionEditorRef.current) {
                            setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                          }
                        }
                      }
                    }}
                    data-placeholder="Добавьте описание задачи..."
                    className="w-full flex-1 min-h-[150px] px-2 sm:px-3 py-2 bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] focus:outline-none focus:border-blue-500/30 transition-all whitespace-pre-wrap break-words overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-white/30 will-change-contents"
                    style={{ transform: 'translate Z(0)' }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = 'rgb(59, 130, 246)';
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.backgroundColor = '';
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.backgroundColor = '';
                      
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
                        if (imageFiles.length > 0) {
                          for (const file of imageFiles) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                              });
                              if (response.ok) {
                                const data = await response.json();
                                const uploadedAttachment = {
                                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                                  name: data.filename || file.name,
                                  url: data.url,
                                  type: 'image' as const,
                                  size: data.size || file.size,
                                  uploadedAt: new Date().toISOString()
                                };
                                setEditingTodo(prev => prev ? {
                                  ...prev,
                                  attachments: [...(prev.attachments || []), uploadedAttachment]
                                } : null);
                              }
                            } catch (error) {
                              console.error('Error uploading image:', error);
                            }
                          }
                        }
                      }
                    }}
                    onPaste={async (e) => {
                      const items = e.clipboardData.items;
                      for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.type.indexOf('image') !== -1) {
                          e.preventDefault();
                          const blob = item.getAsFile();
                          if (blob) {
                            const formData = new FormData();
                            formData.append('file', blob, 'pasted-image.png');
                            try {
                              const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                              });
                              if (response.ok) {
                                const data = await response.json();
                                const uploadedAttachment = {
                                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                                  name: data.filename || 'pasted-image.png',
                                  url: data.url,
                                  type: 'image' as const,
                                  size: data.size || blob.size,
                                  uploadedAt: new Date().toISOString()
                                };
                                setEditingTodo(prev => prev ? {
                                  ...prev,
                                  attachments: [...(prev.attachments || []), uploadedAttachment]
                                } : null);
                              }
                            } catch (error) {
                              console.error('Error uploading pasted image:', error);
                            }
                          }
                          break;
                        }
                      }
                    }}
                  >
                  </div>
                </div>

                {/* Вложения - файлы (не картинки) */}
                <div className="px-1.5 sm:px-2 py-1.5 sm:py-2 border-t border-gray-200 dark:border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs text-gray-500 dark:text-white/50 select-none">Вложения</span>
                    {editingTodo.attachments && editingTodo.attachments.length > 0 && (
                      <span className="text-[10px] bg-[var(--bg-glass-hover)] text-white/50 px-1.5 py-0.5 rounded-full">
                        {editingTodo.attachments.length}
                      </span>
                    )}
                    <label className="ml-auto cursor-pointer px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors flex items-center gap-1">
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            // Показываем индикатор загрузки
                            const loadingToast = document.createElement('div');
                            loadingToast.className = 'fixed top-4 right-4 bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg text-sm z-50';
                            loadingToast.textContent = `Загрузка ${files.length} файл${files.length === 1 ? 'а' : 'ов'}...`;
                            document.body.appendChild(loadingToast);
                            
                            // Загружаем файлы на сервер
                            const uploadPromises = Array.from(files).map(async (file) => {
                              const formData = new FormData();
                              formData.append('file', file);
                              
                              try {
                                const response = await fetch('/api/upload', {
                                  method: 'POST',
                                  body: formData
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  return {
                                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                                    name: data.filename || file.name,
                                    url: data.url,
                                    type: file.type.startsWith('image/') ? 'image' : 'file',
                                    size: data.size || file.size,
                                    uploadedAt: new Date().toISOString()
                                  };
                                } else {
                                  console.error('Failed to upload file:', file.name);
                                  return null;
                                }
                              } catch (error) {
                                console.error('Error uploading file:', error);
                                return null;
                              }
                            });
                            
                            const uploadedAttachments = (await Promise.all(uploadPromises)).filter(Boolean) as Attachment[];
                            
                            // Обновляем индикатор загрузки
                            if (loadingToast) {
                              loadingToast.textContent = `✓ Загружено ${uploadedAttachments.length} файл${uploadedAttachments.length === 1 ? '' : uploadedAttachments.length < 5 ? 'а' : 'ов'}`;
                              loadingToast.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm z-50';
                              setTimeout(() => loadingToast.remove(), 2000);
                            }
                            
                            if (uploadedAttachments.length > 0) {
                              setEditingTodo(prev => prev ? {
                                ...prev,
                                attachments: [...(prev.attachments || []), ...uploadedAttachments]
                              } : null);
                            }
                          }
                        }}
                      />
                      <span className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                        <Plus className="w-3 h-3" />
                        Добавить
                      </span>
                    </label>
                  </div>
                  {editingTodo.attachments && editingTodo.attachments.filter(a => a.type !== 'image').length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editingTodo.attachments.filter(a => a.type !== 'image').map(att => (
                        <div key={att.id} className="relative group">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 dark:bg-[var(--bg-glass)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg hover:bg-gray-100 dark:hover:bg-[var(--bg-glass-hover)] transition-colors w-[120px]"
                          >
                            <svg className="w-4 h-4 text-gray-500 dark:text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] text-gray-700 dark:text-[var(--text-secondary)] truncate flex-1 min-w-0">{att.name}</span>
                          </a>
                          <button
                            onClick={() => {
                              setEditingTodo(prev => prev ? {
                                ...prev,
                                attachments: prev.attachments?.filter(a => a.id !== att.id)
                              } : null);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[var(--text-primary)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Resize handle between center and right */}
              <div 
                className="hidden lg:block w-1 cursor-col-resize bg-transparent hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors relative z-10 flex-shrink-0 group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  resizeStartXRef.current = e.clientX;
                  resizeStartWidthsRef.current = columnWidths;
                  setIsResizing(1);
                }}
                title="Перетащите для изменения ширины"
              >
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center">
                  <div className="w-0.5 h-6 bg-gray-300 dark:bg-white/20 group-hover:bg-blue-500 transition-colors rounded-full"></div>
                </div>
              </div>

              {/* Правый блок - Обсуждение */}
              <div 
                className="w-full lg:w-[var(--col-right)] flex flex-col bg-[var(--bg-secondary)] order-3 lg:order-3 overflow-y-auto min-h-0 min-w-0 transition-[width] duration-100"
              >
                {/* Заголовок */}
                <div className="px-3 py-2.5 border-b border-[var(--border-color)] flex items-center justify-between bg-gradient-to-br from-white/5 to-white/2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-[var(--text-secondary)] select-none">Обсуждение</span>
                  </div>
                </div>

                {/* Кнопка создания/открытия чата */}
                <div className="flex-1 flex items-center justify-center p-4">
                  {editingTodo.chatId ? (
                    <a
                      href={`/messages?chat=${editingTodo.chatId}`}
                      className="px-6 py-3 bg-gradient-to-br from-green-500/20 to-green-600/30 hover:from-green-500/30 hover:to-green-600/40 text-green-400 hover:text-green-300 rounded-2xl transition-all border border-green-500/30 hover:border-green-400/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_12px_rgba(34,197,94,0.15)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_6px_16px_rgba(34,197,94,0.25)] backdrop-blur-xl flex items-center gap-2 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Открыть обсуждение
                    </a>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          // Собираем всех причастных к задаче
                          const participantIds = new Set<string>();
                          
                          // Добавляем заказчика
                          if (editingTodo.assignedById) participantIds.add(editingTodo.assignedById);
                          
                          // Добавляем исполнителей
                          if (editingTodo.assignedToIds && editingTodo.assignedToIds.length > 0) {
                            editingTodo.assignedToIds.forEach(id => participantIds.add(id));
                          } else if (editingTodo.assignedToId) {
                            participantIds.add(editingTodo.assignedToId);
                          }
                          
                          // Добавляем текущего пользователя
                          if (myAccountId) participantIds.add(myAccountId);
                          
                          const participantsArray = Array.from(participantIds);
                          
                          if (participantsArray.length === 0) {
                            alert('Невозможно создать чат: нет участников');
                            return;
                          }
                          
                          // Создаем чат
                          const chatRes = await fetch('/api/chats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              isGroup: participantsArray.length > 2,
                              participantIds: participantsArray,
                              title: `Обсуждение: ${editingTodo.title}`,
                              todoId: editingTodo.id,
                              creatorId: myAccountId || undefined
                            })
                          });
                          
                          if (chatRes.ok) {
                            const newChat = await chatRes.json();
                            // Сохраняем chatId в задаче
                            const updatedTodo = { ...editingTodo, chatId: newChat.id };
                            const saveRes = await fetch('/api/todos', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updatedTodo)
                            });
                            if (saveRes.ok) {
                              const savedTodo = await saveRes.json();
                              setEditingTodo(savedTodo);
                              onUpdate(savedTodo);
                              // Используем router.push вместо window.location.href
                              router.push(`/messages?chat=${newChat.id}`);
                            }
                          } else {
                            alert('Ошибка создания чата');
                          }
                        } catch (error) {
                          console.error('Error creating task chat:', error);
                          alert('Ошибка создания чата');
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-br from-blue-500/20 to-blue-600/30 hover:from-blue-500/30 hover:to-blue-600/40 text-blue-400 hover:text-blue-300 rounded-2xl transition-all border border-blue-500/30 hover:border-blue-400/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_4px_12px_rgba(59,130,246,0.15)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_6px_16px_rgba(59,130,246,0.25)] backdrop-blur-xl flex items-center gap-2 text-sm font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Начать обсуждение
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Футер */}
            <div className="sticky bottom-0 flex flex-col sm:flex-row justify-between items-center gap-2 px-4 py-3 md:border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/95 backdrop-blur-xl">
              <div className="text-[10px] text-[var(--text-muted)] w-full sm:w-auto text-center sm:text-left">
                Создано: {new Date(editingTodo.createdAt).toLocaleDateString('ru-RU')}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={closeTodoModal}
                  className="flex-1 sm:flex-none px-6 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)] transition-all text-sm font-medium shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
                  style={{ borderRadius: '50px' }}
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    // Синхронизируем описание из редактора перед сохранением
                    const updatedTodo = { ...editingTodo };
                    if (descriptionEditorRef.current) {
                      updatedTodo.description = descriptionEditorRef.current.innerHTML || '';
                    }
                    
                    // Log for debugging multiple executors
                    if (updatedTodo.assignedToIds && updatedTodo.assignedToIds.length > 0) {
                      console.log('[SAVE BUTTON] 👥 Saving task with multiple executors:');
                      console.log('[SAVE BUTTON]    assignedToIds:', updatedTodo.assignedToIds);
                      console.log('[SAVE BUTTON]    assignedToNames:', updatedTodo.assignedToNames);
                      console.log('[SAVE BUTTON]    assignedToId:', updatedTodo.assignedToId);
                      console.log('[SAVE BUTTON]    assignedTo:', updatedTodo.assignedTo);
                    }
                    
                    updateTodo(updatedTodo);
                  }}
                  className="flex-1 sm:flex-none px-8 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all text-sm font-medium shadow-lg"
                  style={{ borderRadius: '50px' }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
  );
});

export default Editingtodo;
