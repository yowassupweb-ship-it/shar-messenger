'use client';

import React, { memo } from 'react';
import { Check, Edit3, Plus, Settings, Tag, Trash2, X } from 'lucide-react';
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}
interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  editingCategory: Category | null;
  setEditingCategory: (category: Category | null) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  showAddCategory: boolean;
  setShowAddCategory: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  newCategoryColor: string;
  setNewCategoryColor: (color: string) => void;
  newCategoryIcon: string;
  setNewCategoryIcon: (icon: string) => void;
  addCategory: () => void;
  LIST_COLORS: string[];
  CATEGORY_ICONS: any;
}

const CategoryManager = memo(function CategoryManager({
  isOpen,
  onClose,
  categories,
  editingCategory,
  setEditingCategory,
  updateCategory,
  deleteCategory,
  showAddCategory,
  setShowAddCategory,
  newCategoryName,
  setNewCategoryName,
  newCategoryColor,
  setNewCategoryColor,
  newCategoryIcon,
  setNewCategoryIcon,
  addCategory,
  LIST_COLORS,
  CATEGORY_ICONS
}: CategoryManagerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-[var(--bg-tertiary)] w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
            Управление категориями
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-glass)] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-white/50 mb-4">
                Категории общие для всех аккаунтов. Добавляйте, редактируйте и удаляйте категории задач.
              </p>

              {/* Список категорий */}
              <div className="space-y-2 mb-4">
                {categories.map(cat => (
                  <div 
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                  >
                    {editingCategory?.id === cat.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="flex-1 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded focus:outline-none focus:border-white/30"
                        />
                        <input
                          type="color"
                          value={editingCategory.color}
                          onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <select
                          value={editingCategory.icon}
                          onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                          className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-sm"
                        >
                          <option value="search">SEO</option>
                          <option value="file-text">Контент</option>
                          <option value="megaphone">Реклама</option>
                          <option value="bar-chart">Аналитика</option>
                          <option value="share-2">Соцсети</option>
                          <option value="mail">Email</option>
                          <option value="palette">Дизайн</option>
                          <option value="code">Разработка</option>
                          <option value="tag">Другое</option>
                        </select>
                        <button
                          onClick={() => updateCategory(editingCategory)}
                          className="p-1 bg-green-500 text-[var(--text-primary)] rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1 bg-[var(--bg-glass)] rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            {CATEGORY_ICONS[cat.icon] || <Tag className="w-4 h-4" />}
                          </span>
                          <span className="font-medium">{cat.name}</span>
                          <span 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingCategory(cat)}
                            className="p-1.5 hover:bg-[var(--bg-glass)] rounded"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Форма добавления */}
              {showAddCategory ? (
                <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                  <h4 className="text-sm font-medium mb-3">Новая категория</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Название категории"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-white/30"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-white/50 block mb-1">Цвет</label>
                        <div className="flex gap-1">
                          {LIST_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setNewCategoryColor(color)}
                              className={`w-6 h-6 rounded-full transition-transform ${
                                newCategoryColor === color ? 'ring-2 ring-offset-2 ring-white/30 scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-white/50 block mb-1">Иконка</label>
                        <select
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-sm h-8"
                        >
                          <option value="search">SEO</option>
                          <option value="file-text">Контент</option>
                          <option value="megaphone">Реклама</option>
                          <option value="bar-chart">Аналитика</option>
                          <option value="share-2">Соцсети</option>
                          <option value="mail">Email</option>
                          <option value="palette">Дизайн</option>
                          <option value="code">Разработка</option>
                          <option value="tag">Другое</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addCategory}
                        className="flex-1 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] rounded-lg text-sm font-medium border border-[var(--border-color)] hover:bg-white/15"
                      >
                        Добавить
                      </button>
                      <button
                        onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                        className="px-4 py-2 bg-[var(--bg-glass)] rounded-lg text-sm hover:bg-[var(--bg-glass-hover)]"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="w-full py-2 border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:border-[var(--border-light)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить категорию
                </button>
              )}
            </div>

        <div className="flex justify-end p-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-glass-hover)] text-[var(--text-primary)] hover:bg-white/15 rounded-xl transition-all border border-[var(--border-color)]"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
});

export default CategoryManager;
