'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Delete, History, X, Divide, Percent } from 'lucide-react';
import Link from 'next/link';

interface CalculationHistory {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [newResult, setNewResult] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Загрузка userId и истории с сервера
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const myAccountStr = localStorage.getItem('myAccount');
        if (myAccountStr) {
          const myAccount = JSON.parse(myAccountStr);
          setUserId(myAccount.id);
          
          const res = await fetch(`/api/calculator/history/${myAccount.id}`);
          if (res.ok) {
            const data = await res.json();
            const parsedHistory = (data.history || []).map((item: any) => ({
              ...item,
              timestamp: new Date(item.timestamp)
            }));
            setHistory(parsedHistory);
          }
        }
      } catch (e) {
        console.error('Failed to load history from server', e);
      }
    };
    loadHistory();
  }, []);

  // Сохранение истории на сервер
  const saveHistory = async (newHistory: CalculationHistory[]) => {
    setHistory(newHistory);
    
    if (userId) {
      try {
        await fetch(`/api/calculator/history/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: newHistory })
        });
      } catch (e) {
        console.error('Failed to save history to server', e);
      }
    }
  };

  // Поддержка клавиатуры
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      // Цифры
      if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
      }
      // Операторы
      else if (e.key === '+') handleOperator('+');
      else if (e.key === '-') handleOperator('-');
      else if (e.key === '*' || e.key === '×') handleOperator('*');
      else if (e.key === '/' || e.key === '÷') handleOperator('/');
      else if (e.key === '%') handleOperator('%');
      // Действия
      else if (e.key === 'Enter' || e.key === '=') handleEquals();
      else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') handleClear();
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === '.' || e.key === ',') handleDecimal();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, expression, newResult]);

  const handleNumber = (num: string) => {
    if (display.length >= 15 && !newResult) return; // Ограничение длины
    if (newResult) {
      setDisplay(num);
      setExpression(num);
      setNewResult(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
      setExpression(expression + num);
    }
  };

  const handleOperator = (op: string) => {
    setNewResult(false);
    setExpression(expression + ` ${op} `);
    setDisplay('0');
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
      setExpression(expression + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setNewResult(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
      setExpression(expression.slice(0, -1));
    } else {
      setDisplay('0');
      setExpression('');
    }
  };

  const handleEquals = () => {
    try {
      // Безопасное вычисление через Function constructor
      const sanitizedExp = expression.replace(/[^0-9+\-*/.() ]/g, '');
      const result = Function(`'use strict'; return (${sanitizedExp})`)();
      
      const resultStr = Number(result).toFixed(10).replace(/\.?0+$/, '');
      setDisplay(resultStr);
      
      // Добавление в историю
      const newItem: CalculationHistory = {
        id: Date.now().toString(),
        expression: expression,
        result: resultStr,
        timestamp: new Date()
      };
      
      saveHistory([newItem, ...history].slice(0, 50)); // Храним последние 50
      setExpression(resultStr);
      setNewResult(true);
    } catch (error) {
      setDisplay('Ошибка');
      setExpression('');
    }
  };

  const loadFromHistory = (item: CalculationHistory) => {
    setDisplay(item.result);
    setExpression(item.result);
    setNewResult(true);
    setShowHistory(false);
  };

  const clearHistory = () => {
    saveHistory([]);
    setShowHistory(false);
  };

  const buttons = [
    ['C', '⌫', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ];

  const getButtonClass = (btn: string) => {
    const base = 'h-14 sm:h-16 md:h-20 font-bold text-xl sm:text-2xl transition-all active:scale-95 flex items-center justify-center';
    
    if (btn === '=') {
      return `${base} col-span-2 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105`;
    }
    if (['÷', '×', '-', '+', '%'].includes(btn)) {
      return `${base} rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105`;
    }
    if (['C', '⌫'].includes(btn)) {
      return `${base} rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105`;
    }
    return `${base} rounded-full bg-white dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 shadow-md hover:shadow-lg hover:scale-105`;
  };

  const renderButtonContent = (btn: string) => {
    switch (btn) {
      case 'C':
        return <span className="text-lg sm:text-xl font-extrabold">AC</span>;
      case '⌫':
        return <Delete className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />;
      case '%':
        return <Percent className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />;
      case '÷':
        return <Divide className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />;
      case '×':
        return <span className="text-3xl sm:text-4xl font-bold">×</span>;
      case '-':
        return <span className="text-3xl sm:text-4xl font-bold">−</span>;
      case '+':
        return <span className="text-3xl sm:text-4xl font-bold">+</span>;
      case '=':
        return <span className="text-3xl sm:text-4xl font-bold">=</span>;
      default:
        return btn;
    }
  };

  const handleClick = (btn: string) => {
    switch (btn) {
      case 'C':
        handleClear();
        break;
      case '⌫':
        handleBackspace();
        break;
      case '=':
        handleEquals();
        break;
      case '+':
      case '-':
        handleOperator(btn);
        break;
      case '×':
        handleOperator('*');
        break;
      case '÷':
        handleOperator('/');
        break;
      case '%':
        handleOperator('%');
        break;
      case '.':
        handleDecimal();
        break;
      default:
        handleNumber(btn);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0d0d0d] dark:to-[#1a1a1a] p-3 sm:p-4 md:p-8 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between max-w-lg mx-auto">
        <Link
          href="/account?tab=tools"
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl hover:bg-gray-50 dark:hover:bg-[var(--bg-tertiary)] transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Назад</span>
        </Link>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl hover:bg-gray-50 dark:hover:bg-[var(--bg-tertiary)] transition-all shadow-md"
        >
          <History className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">История</span>
        </button>
      </div>

      <div className="w-full max-w-lg md:max-w-5xl mt-20 sm:mt-0">
        {/* Calculator Card */}
        <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-3xl shadow-2xl p-4 sm:p-6 border border-gray-200 dark:border-[var(--border-color)]">
          {/* Horizontal Layout for Desktop */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Display */}
            <div className="md:flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[var(--bg-primary)] dark:to-[var(--bg-tertiary)] rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-[var(--border-color)] min-h-[100px] sm:min-h-[120px] md:min-h-[300px] flex flex-col justify-end">
              <div className="text-xs sm:text-sm text-gray-500 dark:text-[var(--text-muted)] mb-2 min-h-[16px] sm:min-h-[20px] break-all overflow-hidden">
                {expression}
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white text-right break-all overflow-hidden">
                {display}
              </div>
            </div>

            {/* Buttons */}
            <div className="md:flex-1">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {buttons.map((row, i) => (
                  row.map((btn, j) => (
                    <button
                      key={`${i}-${j}`}
                      onClick={() => handleClick(btn)}
                      className={getButtonClass(btn)}
                    >
                      {renderButtonContent(btn)}
                    </button>
                  ))
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col border border-gray-200 dark:border-[var(--border-color)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[var(--border-color)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">История вычислений</h3>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                  >
                    Очистить
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-[var(--text-muted)]" />
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4">
              {history.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-[var(--text-muted)] py-12">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>История пуста</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="w-full p-3 bg-gray-50 dark:bg-[var(--bg-tertiary)] rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors text-left border border-gray-200 dark:border-[var(--border-color)]"
                    >
                      <div className="text-sm text-gray-600 dark:text-[var(--text-secondary)] mb-1">
                        {item.expression}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        = {item.result}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-[var(--text-muted)] mt-1">
                        {new Date(item.timestamp).toLocaleString('ru-RU')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
