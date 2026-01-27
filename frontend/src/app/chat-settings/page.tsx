'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Type, MessageSquare, Palette, Check, User, LogOut, Sun, Moon, ChevronRight, Bell } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/Avatar';
import AvatarUpload from '@/components/AvatarUpload';

// Предустановленные цветовые схемы (адаптивные для светлой и тёмной темы)
const COLOR_PRESETS = [
  { name: 'iMessage', light: '#007aff', dark: '#22a94d' },
  { name: 'Океан', light: '#0891b2', dark: '#06b6d4' },
  { name: 'Виолет', light: '#7c3aed', dark: '#8b5cf6' },
  { name: 'Роза', light: '#db2777', dark: '#ec4899' },
  { name: 'Огонь', light: '#ea580c', dark: '#f97316' },
  { name: 'Индиго', light: '#4f46e5', dark: '#6366f1' },
];

// iOS-style Toggle Switch
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex w-[51px] h-[31px] rounded-full transition-colors duration-200 flex-shrink-0 ${
      checked ? 'bg-[#34c759]' : 'bg-[#e9e9eb] dark:bg-[#39393d]'
    }`}
  >
    <span 
      className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-transform duration-200 ${
        checked ? 'translate-x-[20px]' : 'translate-x-0'
      }`}
    />
  </button>
);

// iOS-style Section
const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="mb-8">
    {title && (
      <h3 className="text-[13px] font-normal text-[#8e8e93] dark:text-[#8e8e93] uppercase tracking-wide px-4 mb-2">
        {title}
      </h3>
    )}
    <div className="bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden">
      {children}
    </div>
  </div>
);

// iOS-style Row
const Row = ({ 
  icon, 
  iconBg, 
  label, 
  value, 
  onClick, 
  toggle,
  toggleValue,
  onToggle,
  isLast = false,
  children
}: { 
  icon?: React.ReactNode;
  iconBg?: string;
  label: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  isLast?: boolean;
  children?: React.ReactNode;
}) => (
  <div 
    className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-[#c6c6c8]/30 dark:border-[#38383a]' : ''} ${onClick ? 'active:bg-[#e5e5ea] dark:active:bg-[#2c2c2e] cursor-pointer' : ''}`}
    onClick={onClick}
  >
    {icon && (
      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconBg || 'bg-[#007aff]'}`}>
        {icon}
      </div>
    )}
    <span className="flex-1 text-[17px] text-[var(--text-primary)]">{label}</span>
    {children}
    {value && <span className="text-[17px] text-[#8e8e93]">{value}</span>}
    {toggle && onToggle && <ToggleSwitch checked={toggleValue || false} onChange={onToggle} />}
    {onClick && !toggle && <ChevronRight className="w-5 h-5 text-[#c7c7cc]" />}
  </div>
);

export default function ChatSettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
    fontSize: 14,
    fontSizeMobile: 13,
    bubbleColor: '#22a94d',
    bubbleColorLight: '#007aff',
    colorPreset: 0
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const myAccountStr = localStorage.getItem('myAccount');
        if (myAccountStr) {
          const myAccount = JSON.parse(myAccountStr);
          const res = await fetch(`/api/users/${myAccount.id}`);
          if (res.ok) {
            const user = await res.json();
            setCurrentUser(user);
            if (user.chatSettings) {
              setChatSettings(prev => ({ ...prev, ...user.chatSettings }));
              return;
            }
          }
        }
        const savedSettings = localStorage.getItem('chatSettings');
        if (savedSettings) {
          setChatSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
        }
      } catch {
        const savedSettings = localStorage.getItem('chatSettings');
        if (savedSettings) {
          try { setChatSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) })); } catch {}
        }
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (newSettings: typeof chatSettings) => {
    setChatSettings(newSettings);
    localStorage.setItem('chatSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent('chatSettingsChanged', { detail: newSettings }));
    
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--accent-primary', newSettings.bubbleColor);
    }
    
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (myAccountStr) {
        const myAccount = JSON.parse(myAccountStr);
        await fetch(`/api/users/${myAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatSettings: newSettings })
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const getStyleName = () => {
    switch(chatSettings.bubbleStyle) {
      case 'modern': return 'Современный';
      case 'classic': return 'Классика';
      case 'minimal': return 'Минимал';
    }
  };

  const getColorName = () => {
    if (chatSettings.colorPreset >= 0 && chatSettings.colorPreset < COLOR_PRESETS.length) {
      return COLOR_PRESETS[chatSettings.colorPreset].name;
    }
    return 'Свой цвет';
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="backdrop-blur-xl bg-[var(--bg-secondary)]/80 border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <h1 className="text-xl font-semibold">Настройки чата</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 pt-6">
          
          {/* Профиль пользователя */}
          <Section>
            <div className="p-4">
              <div className="flex flex-col items-center gap-4">
                {/* Аватар по центру */}
                {currentUser ? (
                  <AvatarUpload
                    currentAvatar={currentUser.avatar}
                    userId={currentUser.id}
                    userName={currentUser.name}
                    size="xl"
                    onAvatarChange={(newAvatarUrl) => {
                      setCurrentUser((prev: any) => ({
                        ...prev,
                        avatar: newAvatarUrl
                      }));
                      // Обновляем myAccount в localStorage
                      const myAccountStr = localStorage.getItem('myAccount');
                      if (myAccountStr) {
                        const myAccount = JSON.parse(myAccountStr);
                        myAccount.avatar = newAvatarUrl;
                        localStorage.setItem('myAccount', JSON.stringify(myAccount));
                      }
                    }}
                  />
                ) : (
                  <div className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    U
                  </div>
                )}
                
                {/* Информация о пользователе */}
                <div className="text-center">
                  <p className="text-[22px] font-semibold text-[var(--text-primary)]">
                    {currentUser?.name || 'Пользователь'}
                  </p>
                  <p className="text-[15px] text-[#8e8e93] mt-1">
                    {currentUser?.email || currentUser?.username || 'Email не указан'}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Внешний вид */}
          <Section title="Внешний вид">
            <Row
              icon={theme === 'dark' ? <Moon className="w-4 h-4 text-white" /> : <Sun className="w-4 h-4 text-white" />}
              iconBg={theme === 'dark' ? 'bg-[#5856d6]' : 'bg-[#ff9500]'}
              label="Тёмная тема"
              toggle
              toggleValue={theme === 'dark'}
              onToggle={() => toggleTheme()}
            />
            <Row
              icon={<Type className="w-4 h-4 text-white" />}
              iconBg="bg-[#007aff]"
              label="Размер текста (Desktop)"
              value={`${chatSettings.fontSize}px`}
            >
              <input
                type="range"
                min="12"
                max="20"
                value={chatSettings.fontSize}
                onChange={(e) => saveSettings({ ...chatSettings, fontSize: parseInt(e.target.value) })}
                className="w-24 h-1 bg-[#e9e9eb] dark:bg-[#39393d] rounded-full appearance-none cursor-pointer accent-[#007aff] mr-2"
              />
            </Row>
            <Row
              icon={<Type className="w-4 h-4 text-white" />}
              iconBg="bg-[#ff9500]"
              label="Размер текста (Mobile)"
              value={`${chatSettings.fontSizeMobile}px`}
              isLast
            >
              <input
                type="range"
                min="11"
                max="18"
                value={chatSettings.fontSizeMobile}
                onChange={(e) => saveSettings({ ...chatSettings, fontSizeMobile: parseInt(e.target.value) })}
                className="w-24 h-1 bg-[#e9e9eb] dark:bg-[#39393d] rounded-full appearance-none cursor-pointer accent-[#007aff] mr-2"
              />
            </Row>
          </Section>

          {/* Сообщения */}
          <Section title="Сообщения">
            <Row
              icon={<MessageSquare className="w-4 h-4 text-white" />}
              iconBg="bg-[#5856d6]"
              label="Стиль баблов"
              value={getStyleName()}
              onClick={() => {
                const styles: Array<'modern' | 'classic' | 'minimal'> = ['modern', 'classic', 'minimal'];
                const currentIndex = styles.indexOf(chatSettings.bubbleStyle);
                const nextIndex = (currentIndex + 1) % styles.length;
                saveSettings({ ...chatSettings, bubbleStyle: styles[nextIndex] });
              }}
            />
            <Row
              icon={<Palette className="w-4 h-4 text-white" />}
              iconBg="bg-gradient-to-br from-pink-500 to-orange-500"
              label="Цветовая схема"
              value={getColorName()}
              onClick={() => setShowColorPicker(!showColorPicker)}
              isLast={!showColorPicker}
            />
            {showColorPicker && (
              <div className="px-4 py-3 border-t border-[#c6c6c8]/30 dark:border-[#38383a]">
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {COLOR_PRESETS.map((preset, index) => (
                    <button
                      key={preset.name}
                      onClick={() => saveSettings({ 
                        ...chatSettings, 
                        bubbleColor: preset.dark,
                        bubbleColorLight: preset.light,
                        colorPreset: index 
                      })}
                      className={`relative w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                        chatSettings.colorPreset === index ? 'ring-2 ring-offset-2 ring-[#007aff] dark:ring-offset-[#1c1c1e]' : ''
                      }`}
                      style={{ 
                        background: `linear-gradient(135deg, ${preset.light} 50%, ${preset.dark} 50%)`
                      }}
                    >
                      {chatSettings.colorPreset === index && (
                        <Check className="w-5 h-5 text-white absolute inset-0 m-auto drop-shadow-lg" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-[#8e8e93]">Свой:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={chatSettings.bubbleColorLight}
                      onChange={(e) => saveSettings({ ...chatSettings, bubbleColorLight: e.target.value, colorPreset: -1 })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0"
                      title="Светлая тема"
                    />
                    <input
                      type="color"
                      value={chatSettings.bubbleColor}
                      onChange={(e) => saveSettings({ ...chatSettings, bubbleColor: e.target.value, colorPreset: -1 })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0"
                      title="Тёмная тема"
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Предпросмотр */}
          <Section title="Предпросмотр">
            <div className="p-4 bg-[#e5e5ea] dark:bg-[#2c2c2e] space-y-3">
              <div className="flex justify-start">
                <div 
                  className={`px-3 py-2 bg-white dark:bg-[#3a3a3c] text-[var(--text-primary)] max-w-[70%] ${
                    chatSettings.bubbleStyle === 'minimal' ? 'rounded-lg' : 
                    chatSettings.bubbleStyle === 'classic' ? 'rounded-2xl' : 'rounded-xl rounded-bl-sm'
                  }`}
                  style={{ fontSize: `${chatSettings.fontSize}px` }}
                >
                  Привет! Как дела?
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] text-[#8e8e93]">12:34</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <div 
                  className={`px-3 py-2 text-white max-w-[70%] ${
                    chatSettings.bubbleStyle === 'minimal' ? 'rounded-lg' : 
                    chatSettings.bubbleStyle === 'classic' ? 'rounded-2xl' : 'rounded-xl rounded-br-sm'
                  }`}
                  style={{ 
                    fontSize: `${chatSettings.fontSize}px`,
                    backgroundColor: theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight
                  }}
                >
                  Отлично! 👍
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] text-white/70">12:35</span>
                    <Check className="w-3 h-3 text-white/70" />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Уведомления */}
          <Section title="Уведомления">
            <Row
              icon={<Bell className="w-4 h-4 text-white" />}
              iconBg="bg-[#ff3b30]"
              label="Уведомления"
              toggle
              toggleValue={notifications}
              onToggle={setNotifications}
              isLast
            />
          </Section>

          {/* Аккаунт */}
          <Section title="Аккаунт">
            <Row
              icon={<LogOut className="w-4 h-4 text-white" />}
              iconBg="bg-[#ff3b30]"
              label="Выйти из аккаунта"
              onClick={() => {
                localStorage.removeItem('myAccount');
                localStorage.removeItem('username');
                localStorage.removeItem('userRole');
                router.push('/login');
              }}
              isLast
            />
          </Section>

          {/* Информация */}
          <p className="text-[13px] text-[#8e8e93] text-center px-4 py-2">
            Версия 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
