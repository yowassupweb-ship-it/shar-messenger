'use client'

import { useState } from 'react'
import { useWordstat } from '@/hooks/useWordstat'

export function ApiTest() {
  const [testResults, setTestResults] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userInfo?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regionsTree?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    testSearch?: any
    error?: string
  }>({})
  const [testing, setTesting] = useState(false)

  const { getUserInfo, getRegionsTree, getTopRequests } = useWordstat()

  const runTests = async () => {
    setTesting(true)
    setTestResults({})

    try {
      // Тест 1: Получение информации о пользователе
      console.log('🔍 Тестирование getUserInfo...')
      const userInfo = await getUserInfo()
      setTestResults(prev => ({ ...prev, userInfo }))

      // Тест 2: Получение дерева регионов
      console.log('🔍 Тестирование getRegionsTree...')
      const regionsTree = await getRegionsTree()
      setTestResults(prev => ({ ...prev, regionsTree: regionsTree.slice(0, 5) }))

      // Тест 3: Поиск по тестовой фразе
      console.log('🔍 Тестирование поиска...')
      const testSearch = await getTopRequests('купить телефон', { numPhrases: 5 })
      setTestResults(prev => ({ ...prev, testSearch }))

    } catch (error) {
      console.error('❌ Ошибка тестирования:', error)
      setTestResults(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }))
    } finally {
      setTesting(false)
    }
  }

  const getLimitInfo = () => {
    if (testResults.userInfo?.userInfo) {
      const { limitPerSecond, dailyLimit, dailyLimitRemaining } = testResults.userInfo.userInfo
      return `${limitPerSecond || 10}/сек, ${dailyLimitRemaining || '?'}/${dailyLimit || 1000}/день`
    }
    return '10/сек, 1000/день'
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--glass-text-primary)' }}>
          Тестирование API
        </h2>
        <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
          Лимиты: {getLimitInfo()}
        </div>
      </div>
      
      <button
        onClick={runTests}
        disabled={testing}
        className="glass-button-primary mb-6"
      >
        {testing ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Тестирование...</span>
          </div>
        ) : (
          'Протестировать API'
        )}
      </button>

      {/* Результаты тестов */}
      <div className="space-y-4">
        {/* Информация о пользователе */}
        {testResults.userInfo && (
          <div className="glass-success-card">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--glass-success-text)' }}>
              ✅ Информация о пользователе
            </h3>
            <div className="text-sm" style={{ color: 'var(--glass-success-text-secondary)' }}>
              <p>Лимит запросов в секунду: <strong>{testResults.userInfo.userInfo?.limitPerSecond || 'неизвестно'}</strong></p>
              <p>Лимит запросов в день: <strong>{testResults.userInfo.userInfo?.dailyLimit || 'неизвестно'}</strong></p>
              <p>Осталось запросов сегодня: <strong>{testResults.userInfo.userInfo?.dailyLimitRemaining || 'неизвестно'}</strong></p>
            </div>
          </div>
        )}

        {/* Дерево регионов */}
        {testResults.regionsTree && (
          <div className="glass-success-card">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--glass-success-text)' }}>
              ✅ Дерево регионов (первые 5)
            </h3>
            <div className="text-sm space-y-1" style={{ color: 'var(--glass-success-text-secondary)' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {testResults.regionsTree.map((region: any, index: number) => (
                <p key={index}>
                  <strong>{region.regionId}</strong>: {region.regionName}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Тестовый поиск */}
        {testResults.testSearch && (
          <div className="glass-success-card">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--glass-success-text)' }}>
              ✅ Тестовый поиск &quot;купить телефон&quot;
            </h3>
            <div className="text-sm" style={{ color: 'var(--glass-success-text-secondary)' }}>
              <p>Общее количество запросов: <strong>{testResults.testSearch.totalCount.toLocaleString('ru-RU')}</strong></p>
              <p>Найдено вариантов: <strong>{testResults.testSearch.topRequests.length}</strong></p>
              <div className="mt-2">
                <p className="font-semibold">Топ 3 запроса:</p>
                <ul className="list-disc list-inside ml-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {testResults.testSearch.topRequests.slice(0, 3).map((item: any, index: number) => (
                    <li key={index}>
                      &quot;{item.phrase}&quot; - {item.count.toLocaleString('ru-RU')} запросов
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Ошибки */}
        {testResults.error && (
          <div className="glass-error-card">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--glass-error-text)' }}>
              ❌ Ошибка тестирования
            </h3>
            <p className="text-sm" style={{ color: 'var(--glass-error-text-secondary)' }}>
              {testResults.error}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}