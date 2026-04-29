import React from 'react';
import { X, FileText, Calendar, Paperclip, Upload, Image, File, Loader2 } from 'lucide-react';
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
  status?: 'uploading' | 'ready' | 'error';
  clientUploadId?: string;
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
  isUploadingAttachments: boolean;
  setIsUploadingAttachments: (value: boolean) => void;
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
  isUploadingAttachments,
  setIsUploadingAttachments,
  fileInputRef,
}) => {
  const DESKTOP_MENU_WIDTH = 220;
  const DESKTOP_MENU_HEIGHT = 300;
  const [isMobileView, setIsMobileView] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 785 : false
  );
  const [desktopAnchor, setDesktopAnchor] = React.useState<{ left: number; top: number } | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMobileView = () => {
      setIsMobileView(window.innerWidth <= 785);
    };

    updateMobileView();
    window.addEventListener('resize', updateMobileView);

    return () => {
      window.removeEventListener('resize', updateMobileView);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAttachmentAnchor = (event: globalThis.Event) => {
      const customEvent = event as CustomEvent<{ x?: number; y?: number }>;
      const x = customEvent.detail?.x;
      const y = customEvent.detail?.y;
      if (typeof x !== 'number' || typeof y !== 'number') return;

      const nextLeft = Math.max(0, Math.min(window.innerWidth - DESKTOP_MENU_WIDTH, x - 36));
      const nextTop = Math.max(8, Math.min(window.innerHeight - DESKTOP_MENU_HEIGHT - 8, y - DESKTOP_MENU_HEIGHT + 34));
      setDesktopAnchor({ left: nextLeft, top: nextTop });
    };

    window.addEventListener('attachment-menu-anchor', handleAttachmentAnchor as EventListener);
    return () => {
      window.removeEventListener('attachment-menu-anchor', handleAttachmentAnchor as EventListener);
    };
  }, []);

  React.useEffect(() => {
    if (!showAttachmentMenu || isMobileView || desktopAnchor || typeof window === 'undefined') return;

    setDesktopAnchor({
      left: Math.max(0, Math.min(window.innerWidth - DESKTOP_MENU_WIDTH, 72)),
      top: Math.max(8, window.innerHeight - DESKTOP_MENU_HEIGHT - 120),
    });
  }, [showAttachmentMenu, isMobileView, desktopAnchor]);

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
                          taskId: task.id,
                          assignedTo: task.assignedTo,
                          assignedToId: task.assignedToId,
                          assignedToIds: task.assignedToIds,
                          assignedToNames: task.assignedToNames,
                          assignedBy: task.assignedBy,
                          assignedById: task.assignedById,
                          status: task.status,
                          priority: task.priority
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
                        <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
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
                            eventId: event.id,
                            organizerId: event.organizerId,
                            organizerName: event.organizerName,
                            participants: event.participants,
                            date: event.start || event.date,
                            eventType: event.type
                          }]);
                          setShowEventPicker(false);
                        }}
                        className="w-full text-left p-3 bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] rounded-lg border border-[var(--border-color)] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{event.title}</h4>
                            {event.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(event.start || event.date || '').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                              {event.type && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                  {event.type}
                                </span>
                              )}
                            </div>
                          </div>
                          <Calendar className="w-4 h-4 text-green-400 flex-shrink-0" />
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
          className={`fixed inset-0 z-50 ${isMobileView ? 'flex items-end sm:items-center justify-center' : ''}`}
          onClick={() => setShowAttachmentMenu(false)}
        >
          {/* Backdrop */}
          {isMobileView && <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />}
          
          {/* Modal / Popup */}
          <div 
            className={`bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] shadow-[var(--shadow-card)] overflow-hidden ${isMobileView ? 'relative w-full sm:w-auto sm:min-w-[360px] max-w-md rounded-t-[25px] sm:rounded-[25px] pb-safe min-h-[50vh] sm:min-h-0' : 'absolute w-[220px] rounded-[14px] min-h-0'}`}
            style={!isMobileView && desktopAnchor ? { left: `${desktopAnchor.left}px`, top: `${desktopAnchor.top}px` } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle для мобильных */}
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-[var(--border-light)]" />
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-[var(--text-primary)]">
                <Paperclip className="w-4 h-4 text-[var(--accent-primary)]" />
                Добавить
              </h3>
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="w-8 h-8 rounded-full hover:bg-[var(--bg-glass-hover)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            {isUploadingAttachments && (
              <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-glass)]">
                <div className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-primary)]" />
                  <span>Загрузка вложений...</span>
                </div>
              </div>
            )}
            
            {/* Drop Zone - только на мобильных */}
            {isMobileView && (
              <div 
                className="hidden md:block mx-3 mt-3 p-3 border-2 border-dashed border-[var(--border-color)] rounded-[14px] hover:border-[var(--accent-primary)]/60 hover:bg-[var(--bg-glass-hover)] transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-500');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-blue-500');
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500');
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0) {
                    const pendingItems = files.map((file) => ({
                      clientUploadId: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      status: 'uploading',
                      type: file.type.startsWith('image/') ? 'image' : 'file',
                      name: file.name,
                      url: '',
                    }));
                    setAttachments((prev) => [...prev, ...pendingItems]);
                    setIsUploadingAttachments(true);
                    await Promise.all(files.map(async (file, index) => {
                      const clientUploadId = pendingItems[index].clientUploadId;
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      try {
                        const uploadRes = await fetch('/api/upload', {
                          method: 'POST',
                          body: formData
                        });
                        if (!uploadRes.ok) {
                          throw new Error(`Upload failed with status ${uploadRes.status}`);
                        }

                        const uploadData = await uploadRes.json();
                        setAttachments((prev) => prev.map((att: any) => {
                          if (att.clientUploadId !== clientUploadId) return att;
                          return { ...att, status: 'ready', url: uploadData.url };
                        }));
                      } catch (error) {
                        console.error('Error uploading file:', error);
                        setAttachments((prev) => prev.map((att: any) => {
                          if (att.clientUploadId !== clientUploadId) return att;
                          return { ...att, status: 'error' };
                        }));
                      }
                    }));
                    setIsUploadingAttachments(false);
                    setShowAttachmentMenu(false);
                  }
                }}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-glass-hover)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">Перетащите файл</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">или нажмите для выбора</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Options grid */}
            {isMobileView ? (
            <div className="p-4 grid grid-cols-3 gap-3">
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  setShowTaskPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-cyan-500" />
                </div>
                <span className="text-xs text-[var(--text-primary)]">Задача</span>
              </button>
              
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  setShowEventPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-green-500" />
                </div>
                <span className="text-xs text-[var(--text-primary)]">Событие</span>
              </button>
              
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image className="w-6 h-6 text-pink-500" />
                </div>
                <span className="text-xs text-[var(--text-primary)]">Фото</span>
              </button>
              
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <File className="w-6 h-6 text-orange-500" />
                </div>
                <span className="text-xs text-[var(--text-primary)]">Файл</span>
              </button>
              
              <button
                disabled={isUploadingAttachments}
                onClick={() => setShowAttachmentMenu(false)}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <X className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-xs text-[var(--text-primary)]">Отмена</span>
              </button>
            </div>
            ) : (
            <div className="p-1.5 space-y-0.5">
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  setShowTaskPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 text-cyan-500" />
                Задача
              </button>
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  setShowEventPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calendar className="w-4 h-4 text-green-500" />
                Событие
              </button>
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image className="w-4 h-4 text-pink-500" />
                Фото
              </button>
              <button
                disabled={isUploadingAttachments}
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <File className="w-4 h-4 text-orange-500" />
                Файл
              </button>
              <div className="border-t border-[var(--border-color)] my-1" />
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] rounded-[10px] transition-colors"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AttachmentModals;
