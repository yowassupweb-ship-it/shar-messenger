'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import type { ContentPlanMeta, Person } from '@/types/contentPlan';

interface PlanSettingsModalProps {
  isOpen: boolean;
  planData: ContentPlanMeta | null;
  users: Person[];
  contentPlans: ContentPlanMeta[];
  activePlanId: string | null;
  onClose: () => void;
  onUpdate: (plan: ContentPlanMeta) => void;
  onDelete: (planId: string) => void;
  onActivePlanChange: (planId: string) => void;
  addToast: (toast: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}

const PLAN_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export default function PlanSettingsModal({
  isOpen,
  planData,
  users,
  contentPlans,
  activePlanId,
  onClose,
  onUpdate,
  onDelete,
  onActivePlanChange,
  addToast
}: PlanSettingsModalProps) {
  const [editedPlan, setEditedPlan] = React.useState<ContentPlanMeta | null>(null);

  React.useEffect(() => {
    if (planData) {
      setEditedPlan({ ...planData });
    }
  }, [planData]);

  if (!isOpen || !editedPlan) return null;

  const handleSave = async () => {
    try {
      const res = await fetch('/api/content-plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editedPlan.id,
          name: editedPlan.name,
          color: editedPlan.color,
          allowedUsers: editedPlan.allowedUsers
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        onClose();
        addToast({ type: 'success', title: 'Настройки сохранены' });
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить план "${editedPlan.name}"?`)) return;
    
    try {
      await fetch(`/api/content-plans?id=${editedPlan.id}`, { method: 'DELETE' });
      onDelete(editedPlan.id);
      
      if (activePlanId === editedPlan.id) {
        const defaultPlan = contentPlans.find(p => p.isDefault) || contentPlans[0];
        if (defaultPlan) {
          onActivePlanChange(defaultPlan.id);
        }
      }
      
      onClose();
      addToast({ type: 'success', title: 'План удалён' });
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: editedPlan.color }}
            />
            <h3 className="font-semibold">Настройки плана</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Название плана</label>
            <input
              type="text"
              value={editedPlan.name}
              onChange={e => setEditedPlan({ ...editedPlan, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">Цвет</label>
            <div className="flex gap-2">
              {PLAN_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditedPlan({ ...editedPlan, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${editedPlan.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">Доступ к плану</label>
            <p className="text-xs text-gray-500 dark:text-white/50 mb-2">
              Выберите пользователей, которые могут видеть и редактировать этот план. Если никто не выбран — доступен всем.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-lg p-2">
              {users.map(user => {
                const isExplicitlyAllowed = editedPlan.allowedUsers?.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isExplicitlyAllowed || false}
                      onChange={(e) => {
                        const currentAllowed = editedPlan.allowedUsers || [];
                        if (e.target.checked) {
                          setEditedPlan({
                            ...editedPlan,
                            allowedUsers: [...currentAllowed, user.id]
                          });
                        } else {
                          setEditedPlan({
                            ...editedPlan,
                            allowedUsers: currentAllowed.filter(id => id !== user.id)
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                        {(user.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm">{user.name}</span>
                  </label>
                );
              })}
            </div>
            {!editedPlan.allowedUsers?.length && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Доступен всем пользователям
              </p>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-white/10 px-5 py-4 flex justify-between">
          {!editedPlan.isDefault && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Удалить план
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
