import React from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Todo, TodoList } from '@/types/todos';

interface ArchivedSectionProps {
  showArchive: boolean;
  lists: TodoList[];
  getArchivedTodos: () => Todo[];
  getTodosForList: (listId: string, includeArchived: boolean) => Todo[];
  listCounts: Record<string, { completedCount: number; totalCount: number }>;
  toggleArchiveTodo: (todoId: string, archive: boolean) => void;
  deleteTodo: (id: string) => void;
  toggleArchiveList: (listId: string, archive: boolean) => void;
  deleteList: (id: string) => void;
  handleTodoMouseEnter: (e: React.MouseEvent, todo: Todo) => void;
  handleTodoMouseLeave: () => void;
  PRIORITY_COLORS: Record<string, string>;
}

export default function ArchivedSection({
  showArchive,
  lists,
  getArchivedTodos,
  getTodosForList,
  listCounts,
  toggleArchiveTodo,
  deleteTodo,
  toggleArchiveList,
  deleteList,
  handleTodoMouseEnter,
  handleTodoMouseLeave,
  PRIORITY_COLORS
}: ArchivedSectionProps) {
  if (!showArchive || (lists.filter(l => l.archived).length === 0 && getArchivedTodos().length === 0)) {
    return null;
  }

  return (
    <div className="mt-6 px-6">
      <div className="flex items-center gap-2 mb-4">
        <Archive className="w-5 h-5 text-orange-400" />
        <h2 className="text-lg font-semibold text-orange-400">Архив</h2>
      </div>
      
      {/* Архивные задачи */}
      {getArchivedTodos().length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Архивные задачи</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getArchivedTodos().map(todo => {
              const list = lists.find(l => l.id === todo.listId);
              return (
                <div
                  key={todo.id}
                  onMouseEnter={(e) => handleTodoMouseEnter(e, todo)}
                  onMouseLeave={handleTodoMouseLeave}
                  className={`bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-3 opacity-60 border-l-3 ${PRIORITY_COLORS[todo.priority]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${todo.completed ? 'line-through text-[var(--text-muted)]' : ''}`}>
                        {todo.title}
                      </p>
                      {list && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                          {list.name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleArchiveTodo(todo.id, false)}
                        className="p-1.5 hover:bg-green-500/20 rounded text-green-400"
                        title="Восстановить"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Архивные списки */}
      {lists.filter(l => l.archived).length > 0 && (
        <>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Архивные списки</h3>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            {lists.filter(l => l.archived).map(list => {
              const listTodos = getTodosForList(list.id, true);
              const { completedCount, totalCount } = listCounts[list.id] || { completedCount: 0, totalCount: 0 };
              
              return (
                <div
                  key={list.id}
                  className="flex-shrink-0 w-80 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl opacity-75"
                >
                  {/* List Header */}
                  <div className="p-2.5 border-b border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: list.color }}
                        />
                        <h3 className="font-medium text-sm truncate text-[var(--text-secondary)]">
                          {list.name}
                        </h3>
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-full">
                          {completedCount}/{totalCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => toggleArchiveList(list.id, false)}
                          className="p-1.5 hover:bg-green-500/20 rounded text-green-400"
                          title="Восстановить список"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteList(list.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                          title="Удалить список"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* List Content */}
                  <div className="p-2.5 space-y-1.5 max-h-64 overflow-y-auto">
                    {listTodos.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] text-center py-4">Нет задач</p>
                    ) : (
                      listTodos.map(todo => (
                        <div
                          key={todo.id}
                          className={`bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-lg p-2 border-l-2 ${PRIORITY_COLORS[todo.priority]}`}
                        >
                          <p className={`text-xs ${todo.completed ? 'line-through text-[var(--text-muted)]' : ''}`}>
                            {todo.title}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
