'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import Modal from './Modal'

interface ResultsLimitDropdownProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const limitOptions = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 200, label: '200' },
  { value: 500, label: '500' },
  { value: 1000, label: '1000' },
  { value: 2000, label: '2000' }
]

export default function ResultsLimitDropdown({ value, onChange, disabled = false }: ResultsLimitDropdownProps) {
  const [showModal, setShowModal] = useState(false)

  const handleSelect = (newValue: number) => {
    onChange(newValue)
    setShowModal(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="glass-dropdown-button"
        disabled={disabled}
      >
        <span>{value}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <div className="glass-card p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
                Количество результатов
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-gray-500/20 transition-colors"
                style={{ color: 'var(--glass-text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {limitOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`p-3 rounded-lg border transition-colors ${
                    value === option.value 
                      ? 'border-blue-400 bg-blue-400/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  style={{ 
                    color: value === option.value ? 'var(--glass-blue)' : 'var(--glass-text-primary)',
                    backgroundColor: value === option.value ? 'rgba(137, 180, 250, 0.1)' : 'var(--glass-bg-tertiary)'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="glass-button px-4 py-2"
              >
                Закрыть
              </button>
            </div>
          </div>
      </Modal>
    </>
  )
}