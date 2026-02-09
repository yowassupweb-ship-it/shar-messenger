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
  assignedById?: string;
  assignedBy?: string;
  delegatedById?: string;
  delegatedBy?: string;
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


const TaskTitleInput = memo(function TaskTitleInput({
titleInputRef,
  defaultValue,
  placeholder
}) {
  return (
    <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
                      <input
                        ref={titleInputRef}
                        type="text"
                        defaultValue={editingTodo.title}
                        className="no-mobile-scale w-full px-2 sm:px-3 py-3 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-4xl sm:text-5xl font-semibold focus:outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
                        placeholder="Название задачи..."
                      />
                    </div>
  );
});

export default TaskTitleInput;
