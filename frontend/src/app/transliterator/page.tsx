'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function TransliteratorPage() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

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
      setToastMessage('Скопировано в буфер обмена!')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
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
      setToastMessage('Файл успешно скачан!')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const handleClear = () => {
    setInputText('')
    setOutputText('')
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-3">
          Транслитерация
        </h1>
        <p className="text-lg text-[var(--foreground)] opacity-70">
          Конвертация кириллицы в латиницу для создания URL-адресов
        </p>
      </div>

      {/* Rule Hint */}
      <div className="card mb-6 bg-gradient-to-r from-[var(--button)]/5 to-[var(--button)]/10 border-l-4 border-[var(--button)]">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-[var(--button)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-[var(--foreground)] mb-2">Как использовать:</p>
            <p className="text-sm text-[var(--foreground)] opacity-80 mb-2">
              Выделяйте слова двойными слэшами для выборочной транслитерации
            </p>
            <div className="bg-[var(--background)] rounded-lg p-3 border border-[var(--border)]">
              <code className="text-sm text-[var(--foreground)] block mb-1">
                //Привет// и //Мир//
              </code>
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-[var(--button)] font-semibold">privet и mir</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input Field */}
        <div className="card hover:border-[var(--button)]/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="inputText" className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <svg className="w-5 h-5 text-[var(--button)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Русский текст
            </label>
            {inputText && (
              <span className="text-xs text-[var(--foreground)] opacity-50">
                {inputText.length} символов
              </span>
            )}
          </div>
          <textarea
            id="inputText"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Введите текст на русском языке...\n\nПример:\nМосква Санкт-Петербург\n//Привет// мир"
            className="w-full min-h-[300px] px-4 py-3 bg-[var(--background)] border-2 border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--button)] focus:border-transparent resize-vertical text-[var(--foreground)] text-base"
          />
        </div>

        {/* Output Field */}
        <div className="card hover:border-[var(--button)]/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="outputText" className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Результат
            </label>
            {outputText && (
              <span className="text-xs text-green-500 font-medium">
                {outputText.length} символов
              </span>
            )}
          </div>
          <textarea
            id="outputText"
            value={outputText}
            readOnly
            placeholder="Здесь появится результат транслитерации..."
            className="w-full min-h-[300px] px-4 py-3 bg-[var(--background)] border-2 border-green-500/30 rounded-lg resize-vertical text-[var(--foreground)] text-base font-mono"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleCopy}
          disabled={!outputText}
          className="bg-[var(--button)] text-white px-6 py-3 rounded-lg hover:bg-[var(--button)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Копировать
        </button>
        <button
          onClick={handleDownload}
          disabled={!outputText}
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Скачать файл
        </button>
        <button
          onClick={handleClear}
          disabled={!inputText && !outputText}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Очистить всё
        </button>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in z-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  )
}