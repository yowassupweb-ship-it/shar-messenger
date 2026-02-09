'use client';

import React, { memo } from 'react';


interface TextsizeComponentProps {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
}}

const TextsizeComponent = memo(function TextsizeComponent({todo, onUpdate}: TextsizeComponentProps) {
  return (
    {openDropdown === 'textSize' && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-xl z-50 min-w-[120px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const h1 = `<h1 class="text-2xl font-bold my-2 text-gray-900 dark:text-white">${selectedText}</h1>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h1;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-base font-bold text-gray-900 dark:text-[var(--text-primary)]">Заголовок 1</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const h2 = `<h2 class="text-xl font-semibold my-2 text-gray-900 dark:text-white">${selectedText}</h2>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h2;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-sm font-semibold text-gray-900 dark:text-[var(--text-primary)]">Заголовок 2</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const h3 = `<h3 class="text-lg font-medium my-2 text-gray-900 dark:text-white">${selectedText}</h3>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = h3;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  // Сохраняем изменения
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-xs font-medium text-gray-900 dark:text-[var(--text-primary)]">Заголовок 3</span>
                          </button>
                          <div className="h-px bg-gray-200 dark:bg-[var(--bg-glass-hover)] my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              const selection = window.getSelection();
                              if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                const selectedText = range.toString();
                                const editor = document.getElementById('description-editor');
                                if (editor && selectedText) {
                                  const span = `<span class="text-sm text-gray-900 dark:text-white">${selectedText}</span>`;
                                  range.deleteContents();
                                  const template = document.createElement('template');
                                  template.innerHTML = span;
                                  range.insertNode(template.content.firstChild!);
                                  editor.focus();
                                  if (editingTodo && descriptionEditorRef.current) {
                                    setEditingTodo(prev => prev ? { ...prev, description: descriptionEditorRef.current!.innerHTML } : prev);
                                  }
                                }
                              }
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[var(--bg-glass)] transition-colors flex items-center gap-2"
                          >
                            <span className="text-xs text-gray-600 dark:text-[var(--text-secondary)]">Обычный текст</span>
                          </button>
                        </div>
                      )}
  );
});

export default TextsizeComponent;
