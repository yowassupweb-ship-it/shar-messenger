'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import Modal from './Modal'

interface DynamicsPeriodDropdownProps {
  value: 'monthly' | 'weekly' | 'daily'
  onChange: (period: 'monthly' | 'weekly' | 'daily') => void
  disabled?: boolean
}

const periodLabels = {
  daily: 'По дням',
  weekly: 'По неделям', 
  monthly: 'По месяцам'
}

export default function DynamicsPeriodDropdown({ 
  value, 
  onChange, 
  disabled = false 
}: DynamicsPeriodDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (period: 'monthly' | 'weekly' | 'daily') => {
    onChange(period)
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className="glass-dropdown-button w-full text-sm flex items-center justify-between"
      >
        <span>{periodLabels[value]}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="glass-card p-6 w-80 max-w-[90vw]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                Период анализа
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(periodLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleSelect(key as 'monthly' | 'weekly' | 'daily')}
                  className={`p-3 rounded-lg text-left transition-all ${
                    value === key 
                      ? 'bg-blue-500/20 border-blue-500/50' 
                      : 'hover:bg-white/5'
                  }`}
                  style={{ 
                    color: value === key ? '#3b82f6' : 'var(--glass-text-primary)',
                    border: value === key ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
      </Modal>
    </>
  )
}