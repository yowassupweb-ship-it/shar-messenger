'use client'

import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Инструкция по установке</h1>
        <p className="text-sm opacity-60 mt-1">Пошаговое руководство по настройке парсера</p>
      </div>

      {/* Скачивание */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">1</span>
          Скачайте файлы парсера
        </h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/direct-parser/download/agent"
            className="px-4 py-2.5 bg-[var(--button)] text-[#1b1b2b] rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            direct_agent.py
          </a>
          <a
            href="/api/direct-parser/download/parser"
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            ad_parser.py
          </a>
          <a
            href="/api/direct-parser/download/requirements"
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            requirements.txt
          </a>
        </div>
      </div>

      {/* Установка зависимостей */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">2</span>
          Установите зависимости
        </h3>
        <div className="bg-[var(--background)] p-4 rounded-lg">
          <code className="text-sm font-mono">pip install -r requirements.txt</code>
        </div>
        <p className="text-sm opacity-60 mt-3">
          Убедитесь, что у вас установлен Python 3.8+ и Google Chrome
        </p>
      </div>

      {/* Получение API ключа */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">3</span>
          Получите API ключ
        </h3>
        <p className="text-sm opacity-70 mb-4">
          Перейдите в раздел &quot;API ключи&quot; и сгенерируйте ключ для подключения парсера.
        </p>
        <Link
          href="/direct-parser/api-keys"
          className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] inline-block"
        >
          Перейти к API ключам →
        </Link>
      </div>

      {/* Запуск */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">4</span>
          Запустите агент
        </h3>
        <div className="bg-[var(--background)] p-4 rounded-lg mb-4">
          <code className="text-sm font-mono break-all">
            python direct_agent.py --api-url {typeof window !== 'undefined' ? window.location.origin : 'https://tools.connecting-server.ru'} --api-key ВАШ_API_КЛЮЧ
          </code>
        </div>
        <p className="text-sm opacity-60">
          Агент подключится к серверу и будет ожидать задачи на парсинг.
        </p>
      </div>

      {/* Использование */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-[var(--button)] text-white rounded-full flex items-center justify-center text-sm">5</span>
          Создайте задачу
        </h3>
        <p className="text-sm opacity-70 mb-4">
          В разделе &quot;Задания&quot; создайте задачу с запросами для парсинга. Агент автоматически выполнит её.
        </p>
        <Link
          href="/direct-parser"
          className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--button)] inline-block"
        >
          Перейти к заданиям →
        </Link>
      </div>

      {/* Требования */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
        <h3 className="font-medium mb-3 text-yellow-400">Системные требования</h3>
        <ul className="text-sm space-y-2 opacity-80">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Python 3.8 или новее
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Google Chrome (последняя версия)
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            ChromeDriver (устанавливается автоматически)
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Стабильное интернет-соединение
          </li>
        </ul>
      </div>
    </div>
  )
}
