'use client';

import React, { memo } from 'react';

interface DepartmentdropdownProps {
  isOpen: boolean;
  onClose: () => void;
  departments: string[];
  filterDepartment: string;
  setFilterDepartment: (department: string) => void;
}

const Departmentdropdown = memo(function Departmentdropdown({
  isOpen,
  onClose,
  departments,
  filterDepartment,
  setFilterDepartment
}: DepartmentdropdownProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-[100] max-h-80 overflow-y-auto text-gray-900 dark:text-white">
        <div className="py-1 flex flex-col">
          <button
            onClick={() => { setFilterDepartment('all'); onClose(); }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
              filterDepartment === 'all'
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'text-gray-800 dark:text-white/90'
            }`}
          >
            Все отделы
          </button>
          {departments.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-white/50 italic">
              Нет отделов
            </div>
          ) : (
            departments.map((department) => (
              <button
                key={department}
                onClick={() => { setFilterDepartment(department); onClose(); }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                  filterDepartment === department
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-gray-800 dark:text-white/90'
                }`}
              >
                {department}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
});

export default Departmentdropdown;
