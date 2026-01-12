'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface StyledSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

const MAX_VISIBLE_OPTIONS = 50 // Ограничиваем количество видимых опций

export function StyledSelect({ value, onChange, options, placeholder = 'Выберите...', className = '' }: StyledSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => o.value === value)
  
  // Мемоизируем фильтрацию и ограничиваем количество
  const filteredOptions = useMemo(() => {
    const filtered = search 
      ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
      : options
    return filtered.slice(0, MAX_VISIBLE_OPTIONS)
  }, [options, search])

  const hasMore = useMemo(() => {
    const filtered = search 
      ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
      : options
    return filtered.length > MAX_VISIBLE_OPTIONS
  }, [options, search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 hover:bg-white/10 transition-colors"
      >
        <span className={selectedOption ? 'text-white' : 'text-white/40'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-[100]"
          style={{
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset'
          }}
        >
          {/* Поиск - всегда показываем если много опций */}
          {options.length > 10 && (
            <div className="p-2 border-b border-white/10">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4a9eff]/50 placeholder:text-white/30"
              />
            </div>
          )}

          {/* Опции */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-white/40">Ничего не найдено</div>
            ) : (
              <>
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/10 transition-colors ${
                      option.value === value ? 'bg-[#4a9eff]/20 text-[#4a9eff]' : 'text-white/80'
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.value === value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
                {hasMore && (
                  <div className="px-3 py-2 text-[10px] text-white/30 text-center border-t border-white/5">
                    Введите запрос для поиска среди всех опций...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
