'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ContentPlanMeta } from '@/types/contentPlan';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  myAccountId: string | null;
  onPlanCreated: (plan: ContentPlanMeta) => void;
  onActivePlanChange: (planId: string) => void;
  addToast: (toast: { type: 'success' | 'error' | 'info'; title: string; message?: string }) => void;
}

const PLAN_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export default function CreatePlanModal({
  isOpen,
  onClose,
  myAccountId,
  onPlanCreated,
  onActivePlanChange,
  addToast
}: CreatePlanModalProps) {
  const [planName, setPlanName] = useState('');
  const [planColor, setPlanColor] = useState('#8B5CF6');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!planName.trim()) return;
    
    try {
      const res = await fetch('/api/content-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planName,
          color: planColor,
          createdBy: myAccountId
        })
      });
      
      if (res.ok) {
        const newPlan = await res.json();
        onPlanCreated(newPlan);
        onActivePlanChange(newPlan.id);
        
        await fetch('/api/content-plans', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activePlanId: newPlan.id })
        });
        
        setPlanName('');
        setPlanColor('#8B5CF6');
        onClose();
        
        addToast({
          type: 'success',
          title: 'План создан',
          message: `"${newPlan.name}" готов к использованию`
        });
      }
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Создать контент-план</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Название</label>
            <input
              type="text"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              placeholder="Например: SMM план на февраль"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">Цвет</label>
            <div className="flex gap-2">
              {PLAN_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setPlanColor(color)}
                  className={`w-8 h-8 rounded-lg transition-all ${planColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-white/10 px-5 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!planName.trim()}
            className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
