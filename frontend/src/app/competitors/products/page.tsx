'use client';

import React, { useEffect, useState } from 'react';
import { Package, Search, Filter, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api'

interface CompetitorProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  days: number;
  source: 'magput' | 'vs-travel' | 'own';
  image?: string;
  route: string[];
  dates: string[];
  enabled: boolean;
}

export default function CompetitorsProductsPage() {
  const [products, setProducts] = useState<CompetitorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch('/api/competitors/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Loaded products:', data);
      setProducts(data);
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (sourceFilter !== 'all' && product.source !== sourceFilter) return false;
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Все источники</option>
            <option value="magput">Magput.ru</option>
            <option value="vs-travel">VS-Travel</option>
            <option value="own">Наши туры</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка товаров...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">Ошибка: {error}</p>
          <button
            onClick={fetchProducts}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Повторить попытку
          </button>
        </div>
      )}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || sourceFilter !== 'all' 
              ? 'Товары не найдены по заданным критериям' 
              : 'Нет доступных товаров'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {product.image && (
              <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{product.name}</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600 dark:text-green-400 font-bold">
                  {product.price.toLocaleString('ru-RU')} {product.currency}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{product.days}д</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
