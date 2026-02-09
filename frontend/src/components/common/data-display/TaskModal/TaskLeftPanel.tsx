'use client';

import React, { memo } from 'react';

interface Person {
  id: string;
  name: string;
  role?: string;
}

interface TaskLeftPanelProps {
  status: string;
  completed: boolean;
  reviewComment?: string;
  assignedById?: string;
  assignedBy?: string;
  delegatedById?: string;
  delegatedBy?: string;
  assignedToIds?: string[];
  assignedToNames?: string[];
  dueDate?: string;
  people: Person[];
  onStatusChange: (status: string) => void;
  onReviewCommentChange: (comment: string) => void;
  onAssignedByChange: (id?: string, name?: string) => void;
  onDelegatedByChange: (id?: string, name?: string) => void;
  onExecutorsChange: (ids: string[], names: string[]) => void;
  onDueDateChange: (date: string) => void;
}

const TaskLeftPanel = memo(function TaskLeftPanel({
  status,
  completed,
  reviewComment,
  assignedById,
  assignedBy,
  delegatedById,
  delegatedBy,
  assignedToIds = [],
  assignedToNames = [],
  dueDate,
  people,
  onStatusChange,
  onReviewCommentChange,
  onAssignedByChange,
  onDelegatedByChange,
  onExecutorsChange,
  onDueDateChange
}: TaskLeftPanelProps) {
  const [showAssignedByDropdown, setShowAssignedByDropdown] = React.useState(false);
  const [showDelegatedByDropdown, setShowDelegatedByDropdown] = React.useState(false);
  const [showExecutorsDropdown, setShowExecutorsDropdown] = React.useState(false);

  const customers = people.filter(p => p.role === 'customer');
  const executors = people.filter(p => p.role === 'executor');

  const handleExecutorToggle = (personId: string, personName: string) => {
    const newIds = assignedToIds.includes(personId)
      ? assignedToIds.filter(id => id !== personId)
      : [...assignedToIds, personId];
    
    const newNames = assignedToIds.includes(personId)
      ? assignedToNames.filter(name => name !== personName)
      : [...assignedToNames, personName];
    
    onExecutorsChange(newIds, newNames);
  };

  return (
    <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
      {/* Статус */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">
          Статус
        </label>
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onStatusChange('pending')}
            className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
              !status || status === 'pending'
                ? 'bg-gradient-to-br from-gray-500/20 to-gray-600/30 text-gray-500 ring-1 ring-gray-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm'
                : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-gray-500/10 hover:to-gray-600/20 hover:text-gray-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
            }`}
          >
            В ожидании
          </button>

          <button
            type="button"
            onClick={() => onStatusChange('in-progress')}
            className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
              status === 'in-progress'
                ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-500 dark:text-blue-400 ring-1 ring-blue-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm'
                : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-blue-500/10 hover:to-blue-600/20 hover:text-blue-500 dark:hover:text-blue-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
            }`}
          >
            В работе
          </button>

          <button
            type="button"
            onClick={() => onStatusChange('review')}
            className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
              status === 'review'
                ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/30 text-purple-500 dark:text-purple-400 ring-1 ring-purple-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm'
                : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-purple-500/10 hover:to-purple-600/20 hover:text-purple-500 dark:hover:text-purple-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
            }`}
          >
            Готово к проверке
          </button>

          <button
            type="button"
            onClick={() => onStatusChange('cancelled')}
            className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
              status === 'cancelled'
                ? 'bg-gradient-to-br from-red-500/20 to-red-600/30 text-red-500 dark:text-red-400 ring-1 ring-red-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm'
                : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-red-500/10 hover:to-red-600/20 hover:text-red-500 dark:hover:text-red-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
            }`}
          >
            Отменена
          </button>

          <button
            type="button"
            onClick={() => onStatusChange('stuck')}
            className={`px-2 py-1.5 rounded-full text-[11px] font-medium transition-[background-color,color] select-none ${
              status === 'stuck'
                ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 text-yellow-500 ring-1 ring-yellow-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-sm'
                : 'bg-gradient-to-br from-white/5 to-white/10 text-gray-500 dark:text-white/50 hover:from-yellow-500/10 hover:to-yellow-600/20 hover:text-yellow-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm border border-white/10'
            }`}
          >
            Застряла
          </button>
        </div>

        {/* Комментарий для статуса "Готово к проверке" */}
        {status === 'review' && (
          <textarea
            value={reviewComment || ''}
            onChange={(e) => onReviewCommentChange(e.target.value)}
            placeholder="Комментарий для проверяющего (опционально)..."
            className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-[20px] text-sm focus:outline-none focus:border-blue-500/50 transition-all text-gray-700 dark:text-[var(--text-secondary)] placeholder-gray-400 dark:placeholder-white/30 resize-none whitespace-pre-wrap break-words shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
            rows={2}
            style={{ minHeight: '60px' }}
          />
        )}
      </div>

      {/* От кого (Заказчик) */}
      <div className="relative">
        <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">
          От кого
        </label>
        <button
          type="button"
          onClick={() => setShowAssignedByDropdown(!showAssignedByDropdown)}
          className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
          style={{ borderRadius: '20px' }}
        >
          <span className="truncate">{assignedBy || 'Не указано'}</span>
        </button>

        {showAssignedByDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onAssignedByChange(undefined, '');
                setShowAssignedByDropdown(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500"
            >
              Не указано
            </button>
            {customers.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onAssignedByChange(person.id, person.name);
                  setShowAssignedByDropdown(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5"
              >
                {person.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Делегировал */}
      <div className="relative">
        <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">
          Делегировал
        </label>
        <button
          type="button"
          onClick={() => setShowDelegatedByDropdown(!showDelegatedByDropdown)}
          className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
          style={{ borderRadius: '20px' }}
        >
          <span className="truncate">{delegatedBy || 'Не указано'}</span>
        </button>

        {showDelegatedByDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onDelegatedByChange(undefined, '');
                setShowDelegatedByDropdown(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500"
            >
              Не указано
            </button>
            {executors.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onDelegatedByChange(person.id, person.name);
                  setShowDelegatedByDropdown(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5"
              >
                {person.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Исполнители (множественный выбор) */}
      <div className="relative">
        <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">
          Исполнители
        </label>
        <button
          type="button"
          onClick={() => setShowExecutorsDropdown(!showExecutorsDropdown)}
          className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm text-left flex items-center justify-between hover:border-blue-500/50 transition-all min-h-[42px] text-gray-900 dark:text-[var(--text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm overflow-hidden will-change-transform"
          style={{ borderRadius: '20px' }}
        >
          <span className="truncate">
            {assignedToIds.length > 0 ? assignedToNames.join(', ') : 'Не назначено'}
          </span>
        </button>

        {showExecutorsDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {executors.map((person) => (
              <label
                key={person.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={assignedToIds.includes(person.id)}
                  onChange={() => handleExecutorToggle(person.id, person.name)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{person.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Срок */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide select-none">
          Срок
        </label>
        <input
          type="date"
          value={dueDate || ''}
          onChange={(e) => onDueDateChange(e.target.value)}
          className="no-mobile-scale w-full px-3 py-2.5 bg-gradient-to-br from-white/5 to-white/10 border border-white/10 text-sm focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
          style={{ borderRadius: '20px', colorScheme: 'dark' }}
        />
      </div>
    </div>
  );
});

export default TaskLeftPanel;
