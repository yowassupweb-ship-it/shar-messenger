'use client'

export default function TransliteratorSettingsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
          Настройки транслитератора
        </h1>
        <p className="text-[var(--foreground)] opacity-70">
          Настройка правил и параметров транслитерации
        </p>
      </div>

      {/* Settings Cards */}
      <div className="space-y-6">
        <div className="card">
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Правила транслитерации
          </h3>
          <p className="text-[var(--foreground)] opacity-70">
            Настройки правил транслитерации будут добавлены в следующих версиях
          </p>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
            Дополнительные параметры
          </h3>
          <p className="text-[var(--foreground)] opacity-70">
            Дополнительные настройки будут добавлены позже
          </p>
        </div>
      </div>
    </div>
  )
}
