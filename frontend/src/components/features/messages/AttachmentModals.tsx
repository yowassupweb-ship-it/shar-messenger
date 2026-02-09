import React from 'react';
import { X, FileText, Calendar, Paperclip, Upload, Image, File } from 'lucide-react';
import { Task } from './types';

interface Event {
  id: string;
  title: string;
  description?: string;
  start?: string;
  date?: string;
  type?: string;
  organizerId?: string;
  participants?: any[];
}

interface Attachment {
  type: string;
  name: string;
  taskId?: string;
  eventId?: string;
  url?: string;
}

interface AttachmentModalsProps {
  showTaskPicker: boolean;
  setShowTaskPicker: (show: boolean) => void;
  showEventPicker: boolean;
  setShowEventPicker: (show: boolean) => void;
  showAttachmentMenu: boolean;
  setShowAttachmentMenu: (show: boolean) => void;
  tasks: Task[];
  events: Event[];
  currentUser: { id: string } | null;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const AttachmentModals: React.FC<AttachmentModalsProps> = ({
  showTaskPicker,
  setShowTaskPicker,
  showEventPicker,
  setShowEventPicker,
  showAttachmentMenu,
  setShowAttachmentMenu,
  tasks,
  events,
  currentUser,
  setAttachments,
  fileInputRef,
}) => {
  return (
    <>
      {/* Task Picker Modal */}
      {showTaskPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Выбрать задачу
              </h3>
              <button
                onClick={() => setShowTaskPicker(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {(() => {
                // Фильтруем задачи - только те, где текущий пользователь участвует
                const allTasks = Array.isArray(tasks) ? tasks : [];
                const myTasks = allTasks.filter(task => {
                  if (!currentUser?.id) return false;
                  const userId = currentUser.id;
                  if (task.assignedById === userId) return true;
                  if (task.assignedToId === userId) return true;
                  if (task.assignedToIds?.includes(userId)) return true;
                  if (task.authorId === userId) return true;
                  return false;
                });
                
                return myTasks.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-8">Нет доступных задач</p>
                ) : (
                  <div className="space-y-2">
                    {myTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => {
                        setAttachments(prev => [...prev, {
                          type: 'task',
                          name: task.title,
                          taskId: task.id
                        }]);
                        setShowTaskPicker(false);
                      }}
                      className="w-full text-left p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {task.status && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                {task.status}
                              </span>
                            )}
                            {task.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                              </span>
                            )}
                          </div>
                        </div>
                        <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowTaskPicker(false)}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Picker Modal */}
      {showEventPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Выбрать событие
              </h3>
              <button
                onClick={() => setShowEventPicker(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {(() => {
                // Фильтруем события - только те где я участник или организатор
                const myEvents = Array.isArray(events) ? events.filter(event => {
                  if (!currentUser) return false;
                  // Я организатор
                  if (event.organizerId === currentUser.id) return true;
                  // Я в списке участников
                  if (Array.isArray(event.participants) && event.participants.some((p: any) => p.id === currentUser.id || p === currentUser.id)) return true;
                  return false;
                }) : [];

                // Сортируем по дате начала (ближайшие первыми)
                const sortedEvents = myEvents.sort((a, b) => {
                  const dateA = new Date(a.start || a.date || '');
                  const dateB = new Date(b.start || b.date || '');
                  return dateA.getTime() - dateB.getTime();
                });

                return sortedEvents.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-8">Нет доступных мероприятий</p>
                ) : (
                  <div className="space-y-2">
                    {sortedEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => {
                          setAttachments(prev => [...prev, {
                            type: 'event',
                            name: event.title,
                            eventId: event.id
                          }]);
                          setShowEventPicker(false);
                        }}
                        className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate">{event.title}</h4>
                            {event.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(event.start || event.date || '').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                              {event.type && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                                  {event.type}
                                </span>
                              )}
                            </div>
                          </div>
                          <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowEventPicker(false)}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal - Модалка выбора вложений */}
      {showAttachmentMenu && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowAttachmentMenu(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            className="relative w-full sm:w-auto sm:min-w-[360px] max-w-md bg-gradient-to-br from-[#1e293b]/95 to-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-t-[25px] sm:rounded-[25px] shadow-2xl overflow-hidden pb-safe min-h-[50vh] sm:min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle для мобильных */}
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-white/90">
                <Paperclip className="w-4 h-4 text-cyan-400" />
                Добавить вложение
              </h3>
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            
            {/* Drop Zone - только на десктопе */}
            <div 
              className="hidden md:block mx-4 mt-4 p-6 border-2 border-dashed border-white/10 rounded-[20px] hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-cyan-400', 'bg-cyan-500/10');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/10');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/10');
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  // Загружаем файлы на сервер
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    try {
                      const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      });
                      
                      if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        setAttachments(prev => [...prev, {
                          type: file.type.startsWith('image/') ? 'image' : 'file',
                          name: file.name,
                          url: uploadData.url
                        }]);
                      }
                    } catch (error) {
                      console.error('Error uploading file:', error);
                    }
                  }
                  setShowAttachmentMenu(false);
                }
              }}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <Upload className="w-7 h-7 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">Перетащите файл сюда</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">или нажмите для выбора</p>
                </div>
              </div>
            </div>
            
            {/* Options grid */}
            <div className="p-4 grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setShowTaskPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Задача</span>
              </button>
              
              <button
                onClick={() => {
                  setShowEventPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Событие</span>
              </button>
              
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image className="w-6 h-6 text-pink-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Фото</span>
              </button>
              
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <File className="w-6 h-6 text-orange-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Файл</span>
              </button>
              
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <X className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Отмена</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttachmentModals;
