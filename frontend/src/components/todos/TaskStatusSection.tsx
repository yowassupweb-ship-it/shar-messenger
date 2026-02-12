'use client';

import React, { memo } from 'react';



interface Todo {
  id: string;
  title: string;
  description?: string;
  status?: string;
  completed: boolean;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  assignedToIds?: string[];
  assignedToNames?: string[];
  assignedById?: string | null;
  assignedBy?: string | null;
  delegatedById?: string | null;
  delegatedBy?: string | null;
  reviewComment?: string;
  attachments?: Attachment[];
  [key: string]: any;
}

interface Attachment {
  id: string;
  type: string;
  url: string;
  name?: string;
}


const TaskStatusSection = memo(function TaskStatusSection({
todo,
  onUpdate
}) {
  return (
    <div>
                      <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">Статус</label>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setEditingTodo({ ...editingTodo, status: 'pending' })}
                          className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
                            !editingTodo.status || editingTodo.status === 'pending' 
                              ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 text-orange-500 dark:text-orange-400 ring-1 ring-orange-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                              : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-orange-500/10 hover:to-orange-600/20 hover:text-orange-500 dark:hover:text-orange-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                          }`}
                        >
                          В ожидании
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTodo({ ...editingTodo, status: 'in-progress' })}
                          className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
                            editingTodo.status === 'in-progress' 
                              ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-500 dark:text-blue-400 ring-1 ring-blue-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                              : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-blue-500/10 hover:to-blue-600/20 hover:text-blue-500 dark:hover:text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                          }`}
                        >
                          В работе
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTodo({ ...editingTodo, status: 'review' })}
                          className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
                            editingTodo.status === 'review' 
                              ? 'bg-gradient-to-br from-green-500/20 to-green-600/30 text-green-500 dark:text-green-400 ring-1 ring-green-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                              : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-green-500/10 hover:to-green-600/20 hover:text-green-500 dark:hover:text-green-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                          }`}
                        >
                          Готово к проверке
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTodo({ ...editingTodo, status: 'cancelled' })}
                          className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
                            editingTodo.status === 'cancelled' 
                              ? 'bg-gradient-to-br from-red-500/20 to-red-600/30 text-red-500 dark:text-red-400 ring-1 ring-red-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                              : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-red-500/10 hover:to-red-600/20 hover:text-red-500 dark:hover:text-red-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                          }`}
                        >
                          Отменена
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTodo({ ...editingTodo, status: 'stuck' })}
                          className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
                            editingTodo.status === 'stuck' 
                              ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 text-yellow-500 ring-1 ring-yellow-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm' 
                              : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-yellow-500/10 hover:to-yellow-600/20 hover:text-yellow-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
                          }`}
                        >
                          Застряла
                        </button>
                      </div>
                      {editingTodo.status === 'review' && (
                        <div className="mt-2">
                          <label className="block text-[10px] font-medium text-gray-500 dark:text-[var(--text-muted)] mb-1 select-none">Комментарий руководителя</label>
                          <textarea
                            value={editingTodo.reviewComment || ''}
                            onChange={(e) => setEditingTodo({ ...editingTodo, reviewComment: e.target.value })}
                            className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-sm focus:outline-none focus:border-blue-500/50 transition-all text-gray-700 dark:text-[var(--text-secondary)] placeholder-gray-400 dark:placeholder-white/30 resize-none whitespace-pre-wrap break-words shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
                            placeholder="Комментарий или замечания..."
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
  );
});

export default TaskStatusSection;
