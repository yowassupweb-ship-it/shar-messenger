'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Type, MessageSquare, Palette, Check, LogOut, Sun, Moon, Bell, Phone, Calendar, Briefcase, MessageCircle, CheckSquare, Users, Globe, Save, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import AvatarUpload from '@/components/AvatarUpload';

const COLOR_PRESETS = [
  { name: 'iMessage', light: '#007aff', dark: '#007aff' },
  { name: 'Океан', light: '#0891b2', dark: '#06b6d4' },
  { name: 'Виолет', light: '#7c3aed', dark: '#8b5cf6' },
  { name: 'Роза', light: '#db2777', dark: '#ec4899' },
  { name: 'Огонь', light: '#ea580c', dark: '#f97316' },
  { name: 'Индиго', light: '#4f46e5', dark: '#6366f1' },
];

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 items-center rounded-full p-[2px] transition-colors duration-200 ease-out flex-shrink-0 border border-[var(--border-light)] ${
      checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)]'
    }`}
  >
    <span
      className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] backdrop-blur-xl shadow-[var(--shadow-card)] p-4 md:p-5">
    <div className="mb-4">
      <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {subtitle && <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const inputClass = 'w-full h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]';

export default function UserSettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string>('');
  const [editForm, setEditForm] = useState({ personalPhone: '', workPhone: '', workSchedule: '', position: '', department: '' });

  const [visibleTabs, setVisibleTabs] = useState({ messages: true, tasks: true, calendar: true, contacts: true, links: true });

  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
    fontSize: 14,
    fontSizeMobile: 13,
    bubbleColor: '#007aff',
    bubbleColorLight: '#007aff',
    colorPreset: 0,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const myAccountStr = localStorage.getItem('myAccount');
        if (myAccountStr) {
          const myAccount = JSON.parse(myAccountStr);
          setCurrentUser(myAccount);
          const res = await fetch(`/api/users/${myAccount.id}`);
          if (res.ok) {
            const user = await res.json();
            setCurrentUser(user);
            if (user.visible_tabs || user.visibleTabs) {
              setVisibleTabs(user.visible_tabs || user.visibleTabs);
            }
            setEditForm({
              personalPhone: user.personalPhone || '',
              workPhone: user.phone || '',
              workSchedule: user.workSchedule || '',
              position: user.position || '',
              department: user.department || '',
            });
            if (user.chatSettings) {
              const loadedSettings = { ...chatSettings, ...user.chatSettings };
              const matchedPresetIndex = COLOR_PRESETS.findIndex(
                (preset) =>
                  preset.light.toLowerCase() === String(loadedSettings.bubbleColorLight || '').toLowerCase() &&
                  preset.dark.toLowerCase() === String(loadedSettings.bubbleColor || '').toLowerCase()
              );
              setChatSettings({
                ...loadedSettings,
                colorPreset: matchedPresetIndex >= 0 ? matchedPresetIndex : -1,
              });
              return;
            }
          }
        }
        const savedSettings = localStorage.getItem('chatSettings');
        if (savedSettings) {
          const parsed = { ...chatSettings, ...JSON.parse(savedSettings) };
          const matchedPresetIndex = COLOR_PRESETS.findIndex(
            (preset) =>
              preset.light.toLowerCase() === String(parsed.bubbleColorLight || '').toLowerCase() &&
              preset.dark.toLowerCase() === String(parsed.bubbleColor || '').toLowerCase()
          );
          setChatSettings({ ...parsed, colorPreset: matchedPresetIndex >= 0 ? matchedPresetIndex : -1 });
        }
      } catch {
        const savedSettings = localStorage.getItem('chatSettings');
        if (savedSettings) {
          try {
            const parsed = { ...chatSettings, ...JSON.parse(savedSettings) };
            const matchedPresetIndex = COLOR_PRESETS.findIndex(
              (preset) =>
                preset.light.toLowerCase() === String(parsed.bubbleColorLight || '').toLowerCase() &&
                preset.dark.toLowerCase() === String(parsed.bubbleColor || '').toLowerCase()
            );
            setChatSettings({ ...parsed, colorPreset: matchedPresetIndex >= 0 ? matchedPresetIndex : -1 });
          } catch {}
        }
      }
    };
    void loadSettings();
  }, []);

  const saveSettings = async (newSettings: typeof chatSettings) => {
    setChatSettings(newSettings);
    localStorage.setItem('chatSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent('chatSettingsChanged', { detail: newSettings }));

    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (myAccountStr) {
        const myAccount = JSON.parse(myAccountStr);
        await fetch(`/api/users/${myAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatSettings: newSettings }),
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const getStyleName = () => {
    switch (chatSettings.bubbleStyle) {
      case 'modern':
        return 'Современный';
      case 'classic':
        return 'Классика';
      case 'minimal':
        return 'Минимал';
    }
  };

  const getColorName = () => {
    if (chatSettings.colorPreset >= 0 && chatSettings.colorPreset < COLOR_PRESETS.length) {
      return COLOR_PRESETS[chatSettings.colorPreset].name;
    }
    return 'Свой цвет';
  };

  const saveProfile = async () => {
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (!myAccountStr) return;

      const myAccount = JSON.parse(myAccountStr);
      const res = await fetch(`/api/users/${myAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalPhone: editForm.personalPhone,
          phone: editForm.workPhone,
          workSchedule: editForm.workSchedule,
          position: editForm.position,
          department: editForm.department,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        const updatedAccount = { ...myAccount, ...updatedUser };
        localStorage.setItem('myAccount', JSON.stringify(updatedAccount));
        setIsEditingProfile(false);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Ошибка при сохранении профиля');
    }
  };

  const saveNavigationSettings = async (tabs: typeof visibleTabs) => {
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (myAccountStr) {
        const myAccount = JSON.parse(myAccountStr);
        const response = await fetch(`/api/users/${myAccount.id}/navigation`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibleTabs: tabs }),
        });

        if (!response.ok) {
          const fallback = await fetch(`/api/users/${myAccount.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visibleTabs: tabs }),
          });
          if (!fallback.ok) {
            throw new Error(`Failed to save navigation (${response.status}/${fallback.status})`);
          }
        }

        setSaveNotice('Навигация сохранена');
        setTimeout(() => setSaveNotice(''), 1400);
      }
    } catch (error) {
      console.error('Failed to save navigation settings:', error);
      setSaveNotice('Ошибка сохранения навигации');
      setTimeout(() => setSaveNotice(''), 1800);
    }
  };

  const handleVisibleTabsChange = (tabId: string, checked: boolean) => {
    const newVisibleTabs = { ...visibleTabs, [tabId]: checked };
    setVisibleTabs(newVisibleTabs);
    void saveNavigationSettings(newVisibleTabs);
  };

  const logout = () => {
    localStorage.removeItem('myAccount');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  const bubbleStyleOptions: Array<{ id: 'modern' | 'classic' | 'minimal'; label: string }> = [
    { id: 'modern', label: 'Современный' },
    { id: 'classic', label: 'Классика' },
    { id: 'minimal', label: 'Минимал' },
  ];

  const isCustomThemeSelected = chatSettings.colorPreset < 0;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="backdrop-blur-xl bg-[var(--bg-secondary)]/85 border-b border-[var(--border-light)] sticky top-0 z-10">
        <div className="h-14 flex items-center px-3 md:px-5 gap-3">
          <button onClick={() => router.back()} className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border-light)] bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] transition-all">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-semibold">Настройки</h1>
            <p className="text-[11px] md:text-xs text-[var(--text-muted)] leading-none mt-0.5">Профиль, интерфейс, навигация и чат</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 md:pb-20">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          <div className="lg:col-span-1 space-y-4 md:space-y-5">
            <Card title="Профиль" subtitle="Основные данные аккаунта">
              <div className="flex flex-col items-center text-center gap-4 min-h-[190px] justify-center">
                {currentUser ? (
                  <div className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">
                    <AvatarUpload
                      currentAvatar={currentUser.avatar}
                      userId={currentUser.id}
                      userName={currentUser.name}
                      size="xl"
                      showHint={false}
                      onAvatarChange={(newAvatarUrl) => {
                        setCurrentUser((prev: any) => ({ ...prev, avatar: newAvatarUrl }));
                        const myAccountStr = localStorage.getItem('myAccount');
                        if (myAccountStr) {
                          const myAccount = JSON.parse(myAccountStr);
                          myAccount.avatar = newAvatarUrl;
                          localStorage.setItem('myAccount', JSON.stringify(myAccount));
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] flex items-center justify-center text-3xl font-bold">?</div>
                )}
                <div className="max-w-full">
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{currentUser?.name || currentUser?.username || 'Профиль не загружен'}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5 break-all">{currentUser ? (currentUser.email || currentUser.username || 'Заполните контакт в профиле') : 'Выполните вход для загрузки профиля'}</p>
                </div>
              </div>
            </Card>

          </div>

          <div className="lg:col-span-2 space-y-4 md:space-y-5">
            <Card title="Контактная информация" subtitle="Личные и рабочие поля профиля">
              {!isEditingProfile ? (
                <div className="space-y-2">
                  {(currentUser?.personalPhone || currentUser?.phone || currentUser?.workSchedule || currentUser?.position || currentUser?.department) ? (
                    <>
                      {currentUser?.personalPhone && <div className="h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)] min-w-[130px]">Личный телефон</span><span className="text-[var(--text-primary)] truncate">{currentUser.personalPhone}</span></div>}
                      {currentUser?.phone && <div className="h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)] min-w-[130px]">Рабочий телефон</span><span className="text-[var(--text-primary)] truncate">{currentUser.phone}</span></div>}
                      {currentUser?.workSchedule && <div className="h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)] min-w-[130px]">График</span><span className="text-[var(--text-primary)] truncate">{currentUser.workSchedule}</span></div>}
                      {currentUser?.position && <div className="h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)] min-w-[130px]">Должность</span><span className="text-[var(--text-primary)] truncate">{currentUser.position}</span></div>}
                      {currentUser?.department && <div className="h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)] min-w-[130px]">Отдел</span><span className="text-[var(--text-primary)] truncate">{currentUser.department}</span></div>}
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">Контактная информация не заполнена</p>
                  )}
                  <button onClick={() => setIsEditingProfile(true)} className="mt-2 w-full h-11 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">Редактировать профиль</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Личный телефон</label>
                    <input type="tel" value={editForm.personalPhone} onChange={(e) => setEditForm((prev) => ({ ...prev, personalPhone: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Рабочий телефон</label>
                    <input type="tel" value={editForm.workPhone} onChange={(e) => setEditForm((prev) => ({ ...prev, workPhone: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">График работы</label>
                    <input type="text" value={editForm.workSchedule} onChange={(e) => setEditForm((prev) => ({ ...prev, workSchedule: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Должность</label>
                    <input type="text" value={editForm.position} onChange={(e) => setEditForm((prev) => ({ ...prev, position: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Отдел</label>
                    <input type="text" value={editForm.department} onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="md:col-span-2 flex gap-2 pt-1">
                    <button onClick={saveProfile} className="flex-1 h-11 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"><Save className="w-4 h-4" />Сохранить</button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditForm({
                          personalPhone: currentUser?.personalPhone || '',
                          workPhone: currentUser?.phone || '',
                          workSchedule: currentUser?.workSchedule || '',
                          position: currentUser?.position || '',
                          department: currentUser?.department || '',
                        });
                      }}
                      className="flex-1 h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-glass-hover)] transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Внешний вид" subtitle="Тема и размеры шрифта">
              <div className="space-y-3">
                <div className="h-12 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-glass)] flex items-center justify-center">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-[var(--text-primary)]" /> : <Sun className="w-4 h-4 text-[var(--text-primary)]" />}
                  </div>
                  <span className="flex-1 text-sm text-[var(--text-primary)]">Тёмная тема</span>
                  <ToggleSwitch checked={theme === 'dark'} onChange={() => toggleTheme()} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 p-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-[var(--text-primary)]">Шрифт Desktop</span>
                      <span className="text-[var(--text-muted)]">{chatSettings.fontSize}px</span>
                    </div>
                    <input type="range" min="12" max="20" value={chatSettings.fontSize} onChange={(e) => saveSettings({ ...chatSettings, fontSize: parseInt(e.target.value) })} className="w-full accent-[var(--accent-primary)]" />
                  </div>
                  <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 p-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-[var(--text-primary)]">Шрифт Mobile</span>
                      <span className="text-[var(--text-muted)]">{chatSettings.fontSizeMobile}px</span>
                    </div>
                    <input type="range" min="11" max="18" value={chatSettings.fontSizeMobile} onChange={(e) => saveSettings({ ...chatSettings, fontSizeMobile: parseInt(e.target.value) })} className="w-full accent-[var(--accent-primary)]" />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Сообщения" subtitle="Стиль баблов и цветовая схема">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">Стиль баблов</p>
                  <div className="grid grid-cols-3 gap-2">
                    {bubbleStyleOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => saveSettings({ ...chatSettings, bubbleStyle: option.id })}
                        className={`h-10 rounded-xl border text-sm transition-colors ${
                          chatSettings.bubbleStyle === option.id
                            ? 'border-[var(--accent-primary)] bg-[var(--bg-glass-hover)] text-[var(--text-primary)]'
                            : 'border-[var(--border-light)] bg-[var(--bg-secondary)]/70 text-[var(--text-muted)] hover:bg-[var(--bg-glass-hover)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 hover:bg-[var(--bg-glass-hover)] px-3 transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-glass)] flex items-center justify-center">
                      <Palette className="w-4 h-4 text-[var(--text-primary)]" />
                    </div>
                    <span className="flex-1 text-left text-sm text-[var(--text-primary)]">Цветовая схема</span>
                    <span className={`text-xs ${isCustomThemeSelected ? 'text-cyan-500 font-medium' : 'text-[var(--text-muted)]'}`}>{isCustomThemeSelected ? 'Кастомная' : getColorName()}</span>
                  </button>
                </div>

                {showColorPicker && (
                  <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 p-3 space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {COLOR_PRESETS.map((preset, index) => (
                        <button
                          key={preset.name}
                          onClick={() => saveSettings({ ...chatSettings, bubbleColor: preset.dark, bubbleColorLight: preset.light, colorPreset: index })}
                          className={`h-10 rounded-xl border transition-all ${chatSettings.colorPreset === index ? 'border-[var(--accent-primary)]' : 'border-[var(--border-light)]'}`}
                          style={{ background: `linear-gradient(135deg, ${preset.light} 50%, ${preset.dark} 50%)` }}
                          title={preset.name}
                        >
                          {chatSettings.colorPreset === index && <Check className="w-4 h-4 text-white mx-auto drop-shadow" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-muted)]">Свой цвет</span>
                      <input type="color" value={chatSettings.bubbleColorLight} onChange={(e) => saveSettings({ ...chatSettings, bubbleColorLight: e.target.value, colorPreset: -1 })} className={`w-9 h-9 rounded-lg cursor-pointer border bg-transparent ${isCustomThemeSelected ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-[var(--border-light)]'}`} title="Светлая тема" />
                      <input type="color" value={chatSettings.bubbleColor} onChange={(e) => saveSettings({ ...chatSettings, bubbleColor: e.target.value, colorPreset: -1 })} className={`w-9 h-9 rounded-lg cursor-pointer border bg-transparent ${isCustomThemeSelected ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-[var(--border-light)]'}`} title="Тёмная тема" />
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-2 inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />Предпросмотр</div>
                  <div className="space-y-2">
                    <div className="max-w-[78%] rounded-xl px-3 py-2 text-sm border border-[var(--border-light)] bg-[var(--bg-glass)] text-[var(--text-primary)]">Привет! Посмотрел настройки.</div>
                    <div className="max-w-[78%] ml-auto rounded-xl px-3 py-2 text-sm text-white" style={{ backgroundColor: theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight }}>Отлично, применяю новый стиль 👍</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Нижняя панель" subtitle="Какие вкладки показывать в навигации">
              {saveNotice && <p className="text-xs text-cyan-500 mb-2">{saveNotice}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { id: 'messages' as const, name: 'Чаты', icon: <MessageCircle className="w-4 h-4" /> },
                  { id: 'tasks' as const, name: 'Задачи', icon: <CheckSquare className="w-4 h-4" /> },
                  { id: 'calendar' as const, name: 'Календарь', icon: <Calendar className="w-4 h-4" /> },
                  { id: 'contacts' as const, name: 'Контакты', icon: <Users className="w-4 h-4" /> },
                  { id: 'links' as const, name: 'Ссылки', icon: <Globe className="w-4 h-4" /> },
                ].map((tab) => (
                  <div key={tab.id} className="h-12 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-glass)] flex items-center justify-center text-[var(--text-primary)]">{tab.icon}</div>
                    <span className="flex-1 text-sm text-[var(--text-primary)]">{tab.name}</span>
                    <ToggleSwitch checked={visibleTabs[tab.id]} onChange={(checked) => handleVisibleTabsChange(tab.id, checked)} />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Уведомления" subtitle="Локальные настройки интерфейса">
              <div className="h-12 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-glass)] flex items-center justify-center">
                  <Bell className="w-4 h-4 text-[var(--text-primary)]" />
                </div>
                <span className="flex-1 text-sm text-[var(--text-primary)]">Уведомления</span>
                <ToggleSwitch checked={notifications} onChange={setNotifications} />
              </div>
            </Card>

            <Card title="Выход" subtitle="Сессия и безопасность">
              <button
                onClick={logout}
                className="w-full h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] transition-colors px-3 text-left flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-glass)] flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-[var(--text-primary)]" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">Выйти из аккаунта</span>
              </button>
              <p className="text-xs text-[var(--text-muted)] mt-3 text-center">Версия 1.0.0</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
