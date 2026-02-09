'use client';

import { Inbox } from 'lucide-react';
import AddTodoForm from '@/components/features/todos/todos/AddTodoForm';
import TodoItem from '@/components/features/todos/todos/TodoItem';

// Локальные определения типов (импортируются из page.tsx)
interface Comment {
  id: string;
  todoId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;
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
  assignedById?: string;
  assignedBy?: string;
  delegatedById?: string;
  delegatedBy?: string;
  assignedToId?: string;
  assignedTo?: string;
  assignedToIds?: string[];
  assignedToNames?: string[];
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
  addToCalendar?: boolean;
  calendarEventId?: string;
  calendarListId?: string;
  chatId?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  archived?: boolean;
  comments?: Comment[];
  readCommentsByUser?: Record<string, string>;
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
}

interface TodoList {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  order: number;
  creatorId?: string;
  department?: string;
  allowedUsers?: string[];
  allowedDepartments?: string[];
  defaultExecutorId?: string;
  defaultCustomerId?: string;
  archived?: boolean;
  createdAt?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

interface Person {
  id: string;
  name: string;
  username?: string;
  telegramId?: string;
  telegramUsername?: string;
  role: 'executor' | 'customer' | 'universal';
  department?: string;
  notifyOnNewTask?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnComment?: boolean;
  notifyOnMention?: boolean;
  lastSeen?: string;
  createdAt: string;
}


interface TodoListColumnProps {
  // Данные
  listTodos: Todo[];
  list: TodoList;
  categories: Category[];
  people: Person[];
  
  // Drag & Drop состояния
  draggedTodo: Todo | null;
  dragOverTodoId: string | null;
  windowWidth: number;
  isDropTarget: boolean;
  
  // Состояния добавления задачи
  addingToList: string | null;
  newTodoTitle: string;
  newTodoDescription: string;
  newTodoAssigneeId: string | null;
  showNewTodoAssigneeDropdown: boolean;
  myAccountId: string | null;
  
  // Обработчики Drag & Drop
  handleDragStart: (e: React.DragEvent, todo: Todo) => void;
  handleDragEnd: () => void;
  handleTodoDragOver: (e: React.DragEvent, todoId: string) => void;
  handleTodoDrop: (e: React.DragEvent, todo: Todo) => void;
  handleTodoMouseEnter: (e: React.MouseEvent, todo: Todo) => void;
  handleTodoMouseLeave: () => void;
  
  // Обработчики действий с задачами
  toggleTodo: (todo: Todo) => void;
  openTodoModal: (todo: Todo) => void;
  toggleArchiveTodo: (id: string, archived: boolean) => void;
  deleteTodo: (id: string) => void;
  
  // Обработчики формы добавления
  setNewTodoTitle: (title: string) => void;
  setNewTodoDescription: (desc: string) => void;
  setNewTodoAssigneeId: (id: string | null) => void;
  setShowNewTodoAssigneeDropdown: (show: boolean) => void;
  addTodo: () => void;
  setAddingToList: (listId: string | null) => void;
}

export default function TodoListColumn({
  listTodos,
  list,
  categories,
  people,
  draggedTodo,
  dragOverTodoId,
  windowWidth,
  isDropTarget,
  addingToList,
  newTodoTitle,
  newTodoDescription,
  newTodoAssigneeId,
  showNewTodoAssigneeDropdown,
  myAccountId,
  handleDragStart,
  handleDragEnd,
  handleTodoDragOver,
  handleTodoDrop,
  handleTodoMouseEnter,
  handleTodoMouseLeave,
  toggleTodo,
  openTodoModal,
  toggleArchiveTodo,
  deleteTodo,
  setNewTodoTitle,
  setNewTodoDescription,
  setNewTodoAssigneeId,
  setShowNewTodoAssigneeDropdown,
  addTodo,
  setAddingToList,
}: TodoListColumnProps) {
  return (
    <div 
      className={`bg-[var(--bg-secondary)] border-x border-b border-[var(--border-color)] rounded-b-xl p-2 flex flex-col gap-2 min-h-[100px] transition-colors ${
        isDropTarget ? 'bg-[#eaeaea] dark:bg-[var(--bg-glass)]' : ''
      }`}
    >
      {/* Add Task Form */}
      {addingToList === list.id && (
        <AddTodoForm
          listId={list.id}
          newTodoTitle={newTodoTitle}
          newTodoDescription={newTodoDescription}
          newTodoAssigneeId={newTodoAssigneeId}
          showNewTodoAssigneeDropdown={showNewTodoAssigneeDropdown}
          people={people}
          myAccountId={myAccountId || ''}
          setNewTodoTitle={setNewTodoTitle}
          setNewTodoDescription={setNewTodoDescription}
          setNewTodoAssigneeId={setNewTodoAssigneeId}
          setShowNewTodoAssigneeDropdown={setShowNewTodoAssigneeDropdown}
          onAdd={addTodo}
          onCancel={() => { 
            setAddingToList(null); 
            setNewTodoTitle(''); 
            setNewTodoDescription(''); 
            setNewTodoAssigneeId(null); 
          }}
        />
      )}

      {/* Tasks */}
      {listTodos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isDraggable={windowWidth >= 768}
          isDragging={draggedTodo?.id === todo.id}
          isDragOver={dragOverTodoId === todo.id && draggedTodo?.id !== todo.id}
          categories={categories}
          people={people}
          onDragStart={(e) => handleDragStart(e, todo)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleTodoDragOver(e, todo.id)}
          onDrop={(e) => handleTodoDrop(e, todo)}
          onMouseEnter={(e) => handleTodoMouseEnter(e, todo)}
          onMouseLeave={handleTodoMouseLeave}
          onToggle={() => toggleTodo(todo)}
          onEdit={() => openTodoModal(todo)}
          onArchive={() => toggleArchiveTodo(todo.id, true)}
          onDelete={() => deleteTodo(todo.id)}
        />
      ))}

      {/* Empty state */}
      {listTodos.length === 0 && addingToList !== list.id && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-white/60 pointer-events-none">
          <Inbox className="w-8 h-8 mb-2 text-gray-400 dark:text-white/50" />
          <p className="text-sm">Нет задач</p>
        </div>
      )}
    </div>
  );
}
