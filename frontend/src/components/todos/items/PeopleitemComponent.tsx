'use client';

import React, { memo } from 'react';




const PeopleitemComponent = memo(function PeopleitemComponent({}: PeopleitemComponentProps) {
  return (
    (
                      <button
                        key={person.id}
                        onClick={() => { setFilterExecutor(person.id); setExecutorDropdownOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
                          filterExecutor === person.id ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''
                        }`}
                      >
                        {person.name}
                      </button>
                    )
  );
});

export default PeopleitemComponent;
