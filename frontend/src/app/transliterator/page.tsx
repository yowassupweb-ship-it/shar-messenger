'use client'

import { useState, useEffect } from 'react'
import { Copy, Download, Trash2, Check, FileText, Languages } from 'lucide-react'
import { showToast } from '@/components/Toast'

const panelStyle = {
  background: '#1a1a1a',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset, 0 1px 0 0 rgba(255, 255, 255, 0.15) inset'
}

const buttonStyle = {
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.1) inset'
}

export default function TransliteratorPage() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const transliterationRules: Record<string, string> = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
    'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
    'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sh', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
    'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'yu', 'я': 'ya'
  }

  const transliterationRulesWithPunctuation: Record<string, string> = {
    ...transliterationRules,
    ' ': '-',
    ',': ''
  }

  function transliterateSegment(segment: string, isFullText = false) {
    let out = ''
    const rules = isFullText ? transliterationRulesWithPunctuation : transliterationRules
    for (let i = 0; i < segment.length; i++) {
      const ch = segment[i]
      if (Object.prototype.hasOwnProperty.call(rules, ch)) {
        out += rules[ch]
      } else {
        out += ch
      }
    }
    return out.toLowerCase()
  }

  function transliterate(text: string) {
    const segmentRegex = /\/\/([^/]+)\/\//
    const hasSegments = segmentRegex.test(text)
    if (hasSegments) {
      return text.replace(/\/\/([^/]+)\/\//g, (m, inner) => transliterateSegment(inner, false))
    }
    return transliterateSegment(text, true)
  }

  useEffect(() => {
    setOutputText(transliterate(inputText))
  }, [inputText])

  const handleCopy = async () => {
    if (outputText) {
      await navigator.clipboard.writeText(outputText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      showToast('Скопировано в буфер обмена!', 'success')
    }
  }

  const handleDownload = () => {
    if (outputText) {
      const blob = new Blob([outputText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'translit.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Файл скачан!', 'success')
    }
  }

  const handleClear = () => {
    setInputText('')
    setOutputText('')
  }

  return (
    <div className="h-full flex p-4 gap-4">
      {/* Левая панель - Ввод */}
      <div 
        className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        style={panelStyle}
      >
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4a9eff]" />
            <span className="text-xs font-medium text-white/60">Русский текст</span>
          </div>
          {inputText && (
            <span className="text-[10px] text-white/30">
              {inputText.length} символов
            </span>
          )}
        </div>
        
        <div className="flex-1 p-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Введите текст на русском языке...

Пример:
Москва Санкт-Петербург
//Привет// мир"
            className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-sm placeholder:text-white/20"
          />
        </div>
      </div>

      {/* Правая панель - Результат */}
      <div 
        className="flex-1 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        style={panelStyle}
      >
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-white/60">Результат</span>
          </div>
          {outputText && (
            <span className="text-[10px] text-green-400">
              {outputText.length} символов
            </span>
          )}
        </div>
        
        <div className="flex-1 p-3">
          <textarea
            value={outputText}
            readOnly
            placeholder="Здесь появится результат транслитерации..."
            className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-sm font-mono text-[#22D3EE] placeholder:text-white/20"
          />
        </div>

        {/* Кнопки действий */}
        <div className="p-3 border-t border-white/10 flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!outputText}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isCopied 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
            }`}
            style={buttonStyle}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Скопировано!' : 'Копировать'}
          </button>
          
          <button
            onClick={handleDownload}
            disabled={!outputText}
            className="px-4 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={buttonStyle}
            title="Скачать файл"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleClear}
            disabled={!inputText && !outputText}
            className="px-4 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={buttonStyle}
            title="Очистить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
