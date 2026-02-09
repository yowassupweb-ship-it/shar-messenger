'use client';

import React, { memo } from 'react';
import { Check, Clock } from 'lucide-react';

interface ListtodositemComponentProps {
  people: Person[];
}}

const ListtodositemComponent = memo(function ListtodositemComponent({people}: ListtodositemComponentProps) {
  return (
    (
                    <div
                      key={todo.id}
                      draggable={windowWidth >= 768}
                      onDragStart={(e) => handleDragStart(e, todo)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleTodoDragOver(e, todo.id)}
                      onDrop={(e) => handleTodoDrop(e, todo)}
                      onMouseEnter={(e) => handleTodoMouseEnter(e, todo)}
                      onMouseLeave={handleTodoMouseLeave}
                      className={`
                        group bg-white dark:bg-[var(--bg-tertiary)] border border-gray-300 dark:border-[var(--border-color)] rounded-xl p-3 md:cursor-grab md:active:cursor-grabbing
                        transition-all duration-200 hover:shadow-lg hover:border-gray-400 dark:hover:border-[var(--border-light)] border-l-4 ${PRIORITY_COLORS[todo.priority]}
                        ${todo.completed ? 'opacity-70' : ''}
                        ${draggedTodo?.id === todo.id ? 'opacity-50 scale-95' : ''}
                        ${dragOverTodoId === todo.id && draggedTodo?.id !== todo.id ? 'border-t-2 border-t-blue-500' : ''}
                        shadow-md flex flex-col gap-2 will-change-transform
                      `}
                      style={{ transform: 'translateZ(0)' }}
                    >
                      {/* Header: Checkbox + Title */}
                      <div className="flex items-start gap-2 pointer-events-none">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTodo(todo)}
                          className={`
                            w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all pointer-events-auto
                            ${todo.completed 
                              ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30' 
                              : 'border-gray-300 dark:border-[var(--border-color)] hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20'
                            }
                          `}
                        >
                          {todo.completed && <Check className="w-2.5 h-2.5" strokeWidth={2.5} />}
                        </button>
                        
                        {/* Title */}
                        <div className="flex-1 min-w-0 pointer-events-auto cursor-pointer" onClick={() => openTodoModal(todo)}>
                          <p className={`font-medium text-xs ${todo.completed ? 'line-through text-gray-400 dark:text-white/50' : 'text-gray-900 dark:text-white'}`}>
                            {todo.title}
                          </p>
                        </div>
                      </div>
                      
                      {/* Description */}
                      {todo.description && (
                        <p 
                          className="text-[10px] text-gray-600 dark:text-white/60 line-clamp-3 pointer-events-auto cursor-pointer"
                          dangerouslySetInnerHTML={{ __html: todo.description.replace(/<[^>]*>/g, ' ').slice(0, 150) }}
                          onClick={() => openTodoModal(todo)}
                        />
                      )}
                      
                      {/* Bottom Buttons Row */}
                      <div className="flex items-center gap-2 flex-wrap pt-1 pointer-events-auto">
                        {/* Дополнительные метки */}
                        {todo.dueDate && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-[var(--bg-glass)] text-gray-700 dark:text-white/60 text-xs">
                            <Clock className="w-3 h-3" />
                            {new Date(todo.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {todo.categoryId && (() => {
                          const cat = categories.find(c => c.id === todo.categoryId);
                          return cat ? (
                            <span 
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                              style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                            >
                              {CATEGORY_ICONS[cat.icon] || <Tag className="w-3 h-3" />}
                              {cat.name}
                            </span>
                          ) : null;
                        })()}
                        {todo.linkId && todo.linkUrl && (
                          <a
                            href={todo.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:text-blue-300 text-xs"
                            title={todo.linkTitle || todo.linkUrl}
                          >
                            <Link2 className="w-3 h-3" />
                            <span className="max-w-[120px] truncate">{todo.linkTitle || 'Ссылка'}</span>
                          </a>
                        )}
                        
                      </div>
                      
                      {/* Заказчик и исполнители */}
                      {(todo.assignedById || todo.delegatedById || todo.assignedToId || (todo.assignedToIds && todo.assignedToIds.length > 0)) && (
                        <div className="text-[9px] text-gray-500 dark:text-white/40 mt-1">
                          {todo.assignedById && (
                            <span>Заказчик: {getPersonNameById(people, todo.assignedById, todo.assignedBy)}</span>
                          )}
                          {todo.delegatedById && (
                            <span className={todo.assignedById ? "ml-2" : ""}>Делегировал: {getPersonNameById(people, todo.delegatedById, todo.delegatedBy)}</span>
                          )}
                          {(todo.assignedToId || (todo.assignedToIds && todo.assignedToIds.length > 0)) && (
                            <span className={todo.assignedById || todo.delegatedById ? "ml-2" : ""}>
                              Исполнители: {
                                todo.assignedToIds && todo.assignedToIds.length > 0
                                  ? todo.assignedToIds.filter(id => id != null).map((id, idx) => (
                                      <span key={id}>
                                        {idx > 0 && ', '}
                                        {getPersonNameById(people, id)}
                                      </span>
                                    ))
                                  : todo.assignedToId 
                                    ? getPersonNameById(people, todo.assignedToId, todo.assignedTo)
                                    : ''
                              }
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Кнопки действий - редактирование, удаление и архивирование */}
                      <div className="flex items-center justify-between gap-1 mt-1">
                        {/* Кнопка Статус */}
                        {!todo.completed && todo.status && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openTodoModal(todo); }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] border backdrop-blur-sm ${
                              todo.status === 'in-progress' 
                                ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-600 dark:text-blue-400 border-blue-500/30' 
                                : todo.status === 'pending'
                                  ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 text-orange-600 dark:text-orange-400 border-orange-500/30'
                                  : todo.status === 'cancelled'
                                    ? 'bg-gradient-to-br from-red-500/20 to-red-600/30 text-red-600 dark:text-red-400 border-red-500/30'
                                    : todo.status === 'stuck'
                                      ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 text-yellow-600 dark:text-yellow-500 border-yellow-500/30'
                                      : 'bg-gradient-to-br from-green-500/20 to-green-600/30 text-green-600 dark:text-green-400 border-green-500/30'
                            }`}
                          >
                            {todo.status === 'in-progress' ? 'В работе' : 
                             todo.status === 'pending' ? 'В ожидании' : 
                             todo.status === 'cancelled' ? 'Отменена' :
                             todo.status === 'stuck' ? 'Застряла' : 'Готово к проверке'}
                          </button>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                          onClick={(e) => { e.stopPropagation(); openTodoModal(todo); }}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/10 to-blue-600/20 hover:from-blue-500/20 hover:to-blue-600/30 flex items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] border border-blue-500/20 backdrop-blur-sm"
                          title="Редактировать"
                        >
                          <Edit3 className="w-3 h-3 text-blue-500 dark:text-blue-400" strokeWidth={2} />
                        </button>
                        {todo.completed && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleArchiveTodo(todo.id, true); }}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-500/10 to-gray-600/20 hover:from-gray-500/20 hover:to-gray-600/30 flex items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] border border-gray-500/20 backdrop-blur-sm"
                            title="Архивировать"
                          >
                            <Archive className="w-3 h-3 text-gray-500 dark:text-gray-400" strokeWidth={2} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500/10 to-red-600/20 hover:from-red-500/20 hover:to-red-600/30 flex items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_3px_8px_rgba(0,0,0,0.15)] border border-red-500/20 backdrop-blur-sm"
                          title="Удалить"
                        >
                          <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" strokeWidth={2} />
                        </button>
                        </div>
                      </div>
                    </div>
                  )
  );
});

export default ListtodositemComponent;
