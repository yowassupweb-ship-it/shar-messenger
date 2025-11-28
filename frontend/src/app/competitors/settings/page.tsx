'use client';

import React from 'react';
import { Settings, Save } from 'lucide-react';

export default function CompetitorsSettingsPage() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Настройки анализа конкурентов
      </h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Автообновление данных
          </label>
          <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option>Каждый час</option>
            <option>Каждые 6 часов</option>
            <option>Каждый день</option>
            <option>Вручную</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Уведомлять о новых турах конкурентов
            </span>
          </label>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-[#94baf9] hover:bg-[#7aa5e8] text-[#252538] rounded-lg transition-colors font-semibold">
          <Save className="w-5 h-5" />
          Сохранить настройки
        </button>
      </div>
    </div>
  );
}
