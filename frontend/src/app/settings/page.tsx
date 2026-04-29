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

type ChatAsset = {
  name: string;
  path: string;
  url: string;
};

type ThemeAssets = {
  backgrounds: ChatAsset[];
  overlays: ChatAsset[];
};

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

const DARK_GRAPHITE_GRADIENTS = [
  { name: 'Графит 01', start: '#0a0b10', mid: '#11131b', end: '#1a1d28' },
  { name: 'Графит 02', start: '#08090d', mid: '#10131a', end: '#171b24' },
  { name: 'Графит 03', start: '#0b0c12', mid: '#141722', end: '#1d2230' },
  { name: 'Графит 04', start: '#090b10', mid: '#0f131c', end: '#151a25' },
  { name: 'Графит 05', start: '#07080c', mid: '#0d1017', end: '#131823' },
  { name: 'Графит 06', start: '#0c0e14', mid: '#141925', end: '#1c2433' },
  { name: 'Графит 07', start: '#0a0d13', mid: '#121822', end: '#1a2230' },
  { name: 'Графит 08', start: '#06070b', mid: '#0c0f16', end: '#121722' },
];

const createGradientDataUri = (start: string, mid: string, end: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${start}"/><stop offset="52%" stop-color="${mid}"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs><rect width="1600" height="1200" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const BUILTIN_DARK_BACKGROUND_ASSETS: ChatAsset[] = DARK_GRAPHITE_GRADIENTS.map((preset, index) => ({
  name: `${preset.name} (встроенный)`,
  path: `builtin://graphite-${String(index + 1).padStart(2, '0')}`,
  url: createGradientDataUri(preset.start, preset.mid, preset.end),
}));

export default function UserSettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const isTauri = typeof window !== 'undefined' && localStorage.getItem('_platform') === 'tauri';
  const [tauriZoom, setTauriZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('tauriZoom') || '1');
    }
    return 1;
  });
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
    bubbleColorOpponent: '#1f2937',
    bubbleColorOpponentLight: '#e5e7eb',
    bubbleTextColor: '#ffffff',
    bubbleTextColorLight: '#ffffff',
    chatBackgroundDark: '#0f172a',
    chatBackgroundLight: '#f8fafc',
    chatBackgroundImageDark: '',
    chatBackgroundImageLight: '',
    chatOverlayImageDark: '',
    chatOverlayImageLight: '',
    chatOverlayScale: 100,
    chatOverlayOpacity: 1,
    bubbleOpacity: 0.92,
    colorPreset: 0,
  });
  const [chatAssets, setChatAssets] = useState<{ light: ThemeAssets; dark: ThemeAssets }>({
    light: { backgrounds: [], overlays: [] },
    dark: { backgrounds: [], overlays: [] },
  });

  useEffect(() => {
    const loadSettings = async () => {
      const localSettingsRaw = localStorage.getItem('chatSettings');
      let localSettings: Record<string, any> = {};
      if (localSettingsRaw) {
        try {
          localSettings = JSON.parse(localSettingsRaw);
        } catch {
          localSettings = {};
        }
      }

      const applyLoadedSettings = (nextSettings: Record<string, any>) => {
        const merged = { ...chatSettings, ...nextSettings };
        const matchedPresetIndex = COLOR_PRESETS.findIndex(
          (preset) =>
            preset.light.toLowerCase() === String(merged.bubbleColorLight || '').toLowerCase() &&
            preset.dark.toLowerCase() === String(merged.bubbleColor || '').toLowerCase()
        );
        setChatSettings({ ...merged, colorPreset: matchedPresetIndex >= 0 ? matchedPresetIndex : -1 });
      };

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
              const loadedSettings = { ...user.chatSettings, ...localSettings };
              applyLoadedSettings(loadedSettings);
              localStorage.setItem('chatSettings', JSON.stringify({ ...chatSettings, ...loadedSettings }));
              return;
            }
          }
        }
        if (Object.keys(localSettings).length > 0) {
          applyLoadedSettings(localSettings);
        }
      } catch {
        if (Object.keys(localSettings).length > 0) {
          applyLoadedSettings(localSettings);
        }
      }
    };
    void loadSettings();
  }, []);

  useEffect(() => {
    const loadChatAssets = async () => {
      let lightBackgrounds: ChatAsset[] = [];
      let lightOverlays: ChatAsset[] = [];
      let darkBackgrounds: ChatAsset[] = [];
      let darkOverlays: ChatAsset[] = [];

      try {
        const response = await fetch('/api/chat-backgrounds', { cache: 'no-store' });
        if (response.ok) {
          const payload = await response.json();
          lightBackgrounds = Array.isArray(payload?.light?.backgrounds) ? payload.light.backgrounds : [];
          lightOverlays = Array.isArray(payload?.light?.overlays) ? payload.light.overlays : [];
          darkBackgrounds = Array.isArray(payload?.dark?.backgrounds) ? payload.dark.backgrounds : [];
          darkOverlays = Array.isArray(payload?.dark?.overlays) ? payload.dark.overlays : [];
        }
      } catch {}

      setChatAssets({
        light: {
          backgrounds: lightBackgrounds,
          overlays: lightOverlays,
        },
        dark: {
          backgrounds: [...BUILTIN_DARK_BACKGROUND_ASSETS, ...darkBackgrounds],
          overlays: darkOverlays,
        },
      });

      if (darkBackgrounds.length === 0 && lightBackgrounds.length === 0 && lightOverlays.length === 0 && darkOverlays.length === 0) {
        console.error('Failed to load chat assets from API, using built-in dark gradients only');
      }
    };

    void loadChatAssets();
  }, []);

  useEffect(() => {
    // Проверяем статус разрешений на уведомления
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // Обновляем статус каждые 3 секунды (если пользователь изменит в браузере)
      const interval = setInterval(() => {
        setNotificationPermission(Notification.permission);
      }, 3000);
      
      return () => clearInterval(interval);
    }
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
  const [assetEditorTheme, setAssetEditorTheme] = useState<'light' | 'dark'>('dark');

  const getBackgroundFieldByTheme = (targetTheme: 'light' | 'dark') =>
    targetTheme === 'dark' ? 'chatBackgroundImageDark' : 'chatBackgroundImageLight';
  const getOverlayFieldByTheme = (targetTheme: 'light' | 'dark') =>
    targetTheme === 'dark' ? 'chatOverlayImageDark' : 'chatOverlayImageLight';

  const buildAssetOptions = (items: ChatAsset[], noneLabel: string) => [
    { name: noneLabel, url: '' },
    ...items,
  ];

  const normalizeAssets = (items: ChatAsset[]) => {
    const seen = new Set<string>();
    return (items || []).filter((asset) => {
      const key = String(asset?.url || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const currentThemeAssets = assetEditorTheme === 'dark' ? chatAssets.dark : chatAssets.light;
  const themeBackgroundAssets = normalizeAssets(currentThemeAssets.backgrounds);
  const themeOverlayAssets = normalizeAssets(currentThemeAssets.overlays);

  const currentThemeBackgroundOptions = buildAssetOptions(
    themeBackgroundAssets,
    'Без фона'
  );
  const currentThemeOverlayOptions = buildAssetOptions(
    themeOverlayAssets,
    'Без накладки'
  );

  const selectedBackgroundField = getBackgroundFieldByTheme(assetEditorTheme);
  const selectedOverlayField = getOverlayFieldByTheme(assetEditorTheme);
  const selectedBackgroundUrl = String(chatSettings[selectedBackgroundField] || '');
  const selectedOverlayUrl = String(chatSettings[selectedOverlayField] || '');

  const selectedBackgroundIndexRaw = currentThemeBackgroundOptions.findIndex((asset) => asset.url === selectedBackgroundUrl);
  const selectedOverlayIndexRaw = currentThemeOverlayOptions.findIndex((asset) => asset.url === selectedOverlayUrl);
  const selectedBackgroundIndex = selectedBackgroundIndexRaw >= 0 ? selectedBackgroundIndexRaw : 0;
  const selectedOverlayIndex = selectedOverlayIndexRaw >= 0 ? selectedOverlayIndexRaw : 0;

  const selectedBackgroundName = currentThemeBackgroundOptions[selectedBackgroundIndex]?.name || 'Без фона';
  const selectedOverlayName = currentThemeOverlayOptions[selectedOverlayIndex]?.name || 'Без накладки';

  const onBackgroundSliderChange = (nextIndex: number) => {
    const nextAsset = currentThemeBackgroundOptions[nextIndex] || currentThemeBackgroundOptions[0];
    saveSettings({ ...chatSettings, [selectedBackgroundField]: nextAsset?.url || '' });
  };

  const onOverlaySliderChange = (nextIndex: number) => {
    const nextAsset = currentThemeOverlayOptions[nextIndex] || currentThemeOverlayOptions[0];
    saveSettings({ ...chatSettings, [selectedOverlayField]: nextAsset?.url || '' });
  };

  const setBackgroundByIndex = (nextIndex: number) => {
    const index = Math.max(0, Math.min(currentThemeBackgroundOptions.length - 1, nextIndex));
    onBackgroundSliderChange(index);
  };

  const setOverlayByIndex = (nextIndex: number) => {
    const index = Math.max(0, Math.min(currentThemeOverlayOptions.length - 1, nextIndex));
    onOverlaySliderChange(index);
  };

  const cycleBackground = (step: number) => {
    if (currentThemeBackgroundOptions.length <= 1) return;
    const next = (selectedBackgroundIndex + step + currentThemeBackgroundOptions.length) % currentThemeBackgroundOptions.length;
    setBackgroundByIndex(next);
  };

  const cycleOverlay = (step: number) => {
    if (currentThemeOverlayOptions.length <= 1) return;
    const next = (selectedOverlayIndex + step + currentThemeOverlayOptions.length) % currentThemeOverlayOptions.length;
    setOverlayByIndex(next);
  };

  const bubbleOpacityRaw = Number(chatSettings.bubbleOpacity ?? 0.92);
  const bubbleOpacity = Number.isFinite(bubbleOpacityRaw) ? Math.max(0.2, Math.min(1, bubbleOpacityRaw)) : 0.92;
  const overlayScaleRaw = Number(chatSettings.chatOverlayScale ?? 100);
  const overlayScale = Number.isFinite(overlayScaleRaw) ? Math.max(20, Math.min(200, overlayScaleRaw)) : 100;
  const overlayOpacityRaw = Number(chatSettings.chatOverlayOpacity ?? 1);
  const overlayOpacity = Number.isFinite(overlayOpacityRaw) ? Math.max(0, Math.min(1, overlayOpacityRaw)) : 1;

  const hexToRgba = (hex: string, alpha: number): string => {
    const normalized = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const editorPreviewBackground = String(chatSettings[selectedBackgroundField] || '').trim();
  const editorPreviewOverlay = String(chatSettings[selectedOverlayField] || '').trim();

  const editorPreviewStyle = {
    backgroundColor: assetEditorTheme === 'dark'
      ? (chatSettings.chatBackgroundDark || '#0f172a')
      : (chatSettings.chatBackgroundLight || '#f8fafc'),
    backgroundImage: editorPreviewBackground ? `url('${editorPreviewBackground}')` : undefined,
    backgroundSize: editorPreviewBackground ? 'cover' : undefined,
    backgroundRepeat: editorPreviewBackground ? 'no-repeat' : undefined,
    backgroundPosition: editorPreviewBackground ? 'center center' : undefined,
  } as const;
  const editorPreviewOverlayStyle = editorPreviewOverlay
    ? {
        position: 'absolute' as const,
        inset: 0,
        backgroundImage: `url('${editorPreviewOverlay}')`,
        backgroundSize: `${overlayScale}%`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center center',
        opacity: overlayOpacity,
        pointerEvents: 'none' as const,
      }
    : undefined;

  const previewChatBackground = theme === 'dark'
    ? (chatSettings.chatBackgroundDark || '#0f172a')
    : (chatSettings.chatBackgroundLight || '#f8fafc');
  const previewBackgroundImage = theme === 'dark'
    ? String(chatSettings.chatBackgroundImageDark || '').trim()
    : String(chatSettings.chatBackgroundImageLight || '').trim();
  const previewOverlayImage = theme === 'dark'
    ? String(chatSettings.chatOverlayImageDark || '').trim()
    : String(chatSettings.chatOverlayImageLight || '').trim();

  const previewBackgroundStyle = {
    backgroundColor: previewChatBackground,
    backgroundImage: previewBackgroundImage ? `url('${previewBackgroundImage}')` : undefined,
    backgroundSize: previewBackgroundImage ? 'cover' : undefined,
    backgroundRepeat: previewBackgroundImage ? 'no-repeat' : undefined,
    backgroundPosition: previewBackgroundImage ? 'center center' : undefined,
  } as const;
  const previewOverlayStyle = previewOverlayImage
    ? {
        position: 'absolute' as const,
        inset: 0,
        backgroundImage: `url('${previewOverlayImage}')`,
        backgroundSize: `${overlayScale}%`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center center',
        opacity: overlayOpacity,
        pointerEvents: 'none' as const,
      }
    : undefined;

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

                {isTauri && (
                  <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 p-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-[var(--text-primary)]">Масштаб (Tauri)</span>
                      <span className="text-[var(--text-muted)]">{Math.round(tauriZoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="130"
                      step="5"
                      value={Math.round(tauriZoom * 100)}
                      onChange={(e) => {
                        const zoom = parseInt(e.target.value) / 100;
                        setTauriZoom(zoom);
                        localStorage.setItem('tauriZoom', String(zoom));
                        document.documentElement.style.zoom = String(zoom);
                      }}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                      <span>70%</span><span>100%</span><span>130%</span>
                    </div>
                  </div>
                )}
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

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-muted)]">Цвет текста бабла</span>
                      <input type="color" value={chatSettings.bubbleTextColorLight} onChange={(e) => saveSettings({ ...chatSettings, bubbleTextColorLight: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--border-light)] bg-transparent" title="Текст бабла (светлая тема)" />
                      <input type="color" value={chatSettings.bubbleTextColor} onChange={(e) => saveSettings({ ...chatSettings, bubbleTextColor: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--border-light)] bg-transparent" title="Текст бабла (тёмная тема)" />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-muted)]">Цвет бабла оппонента</span>
                      <input type="color" value={chatSettings.bubbleColorOpponentLight} onChange={(e) => saveSettings({ ...chatSettings, bubbleColorOpponentLight: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--border-light)] bg-transparent" title="Бабл оппонента (светлая тема)" />
                      <input type="color" value={chatSettings.bubbleColorOpponent} onChange={(e) => saveSettings({ ...chatSettings, bubbleColorOpponent: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--border-light)] bg-transparent" title="Бабл оппонента (тёмная тема)" />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-muted)]">Фон чата</span>
                      <input type="color" value={chatSettings.chatBackgroundLight} onChange={(e) => saveSettings({ ...chatSettings, chatBackgroundLight: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--border-light)] bg-transparent" title="Фон чата (светлая тема)" />
                      <input type="color" value={chatSettings.chatBackgroundDark} onChange={(e) => saveSettings({ ...chatSettings, chatBackgroundDark: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--border-light)] bg-transparent" title="Фон чата (тёмная тема)" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-muted)]">Графитовые градиенты (тёмная тема)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {DARK_GRAPHITE_GRADIENTS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => saveSettings({
                              ...chatSettings,
                              chatBackgroundDark: preset.end,
                              chatBackgroundImageDark: createGradientDataUri(preset.start, preset.mid, preset.end),
                            })}
                            className="h-10 rounded-xl border border-[var(--border-light)] shadow-[var(--shadow-card)] transition-all hover:scale-[1.01]"
                            style={{ background: `linear-gradient(180deg, ${preset.start} 0%, ${preset.mid} 52%, ${preset.end} 100%)` }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[var(--text-muted)]">Фоны и накладки</p>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)]/70">
                      <button type="button" onClick={() => setAssetEditorTheme('light')} className={`px-2 py-1 rounded-md text-xs transition-colors ${assetEditorTheme === 'light' ? 'bg-[var(--bg-glass-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Светлая</button>
                      <button type="button" onClick={() => setAssetEditorTheme('dark')} className={`px-2 py-1 rounded-md text-xs transition-colors ${assetEditorTheme === 'dark' ? 'bg-[var(--bg-glass-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Тёмная</button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border-light)] overflow-hidden relative" style={editorPreviewStyle}>
                    {editorPreviewOverlayStyle && <div style={editorPreviewOverlayStyle} />}
                    <div className="h-40 p-3 flex flex-col justify-end">
                      <div className="space-y-2 relative z-10">
                        <div className="max-w-[78%] rounded-xl px-3 py-2 text-sm border border-[var(--border-light)] text-[var(--text-primary)]" style={{ backgroundColor: hexToRgba(assetEditorTheme === 'dark' ? chatSettings.bubbleColorOpponent : chatSettings.bubbleColorOpponentLight, bubbleOpacity) }}>Пример подложки и накладки</div>
                        <div className="max-w-[78%] ml-auto rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: hexToRgba(assetEditorTheme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight, bubbleOpacity), color: assetEditorTheme === 'dark' ? (chatSettings.bubbleTextColor || '#ffffff') : (chatSettings.bubbleTextColorLight || '#ffffff') }}>Слайдером листаю варианты</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Фон</span>
                      <span className="text-[var(--text-primary)]">{selectedBackgroundName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cycleBackground(-1)} className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-50" disabled={currentThemeBackgroundOptions.length <= 1}>‹</button>
                      <div className="flex-1 overflow-x-auto scrollbar-hide-mobile">
                        <div className="flex items-center gap-2 min-w-max pr-1">
                          {currentThemeBackgroundOptions.map((asset, idx) => (
                            <button
                              key={`bg-thumb-${asset.url || 'none'}-${idx}`}
                              type="button"
                              onClick={() => setBackgroundByIndex(idx)}
                              className={`relative w-16 h-10 rounded-lg border transition-all overflow-hidden ${selectedBackgroundIndex === idx ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/50' : 'border-[var(--border-light)]'}`}
                              title={asset.name}
                              style={asset.url ? { backgroundImage: `url('${asset.url}')`, backgroundSize: 'cover', backgroundPosition: 'center center', backgroundRepeat: 'no-repeat', backgroundColor: assetEditorTheme === 'dark' ? '#0f172a' : '#f8fafc' } : { backgroundColor: assetEditorTheme === 'dark' ? '#0f172a' : '#f8fafc' }}
                            >
                              {!asset.url && <span className="absolute inset-0 text-[10px] text-[var(--text-muted)] flex items-center justify-center">Нет</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button type="button" onClick={() => cycleBackground(1)} className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-50" disabled={currentThemeBackgroundOptions.length <= 1}>›</button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Накладка</span>
                      <span className="text-[var(--text-primary)]">{selectedOverlayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cycleOverlay(-1)} className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-50" disabled={currentThemeOverlayOptions.length <= 1}>‹</button>
                      <div className="flex-1 overflow-x-auto scrollbar-hide-mobile">
                        <div className="flex items-center gap-2 min-w-max pr-1">
                          {currentThemeOverlayOptions.map((asset, idx) => (
                            <button
                              key={`overlay-thumb-${asset.url || 'none'}-${idx}`}
                              type="button"
                              onClick={() => setOverlayByIndex(idx)}
                              className={`relative w-16 h-10 rounded-lg border transition-all overflow-hidden ${selectedOverlayIndex === idx ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/50' : 'border-[var(--border-light)]'}`}
                              title={asset.name}
                              style={asset.url ? { backgroundImage: `url('${asset.url}')`, backgroundSize: `${overlayScale}%`, backgroundPosition: 'center center', backgroundRepeat: 'repeat', backgroundColor: assetEditorTheme === 'dark' ? '#0f172a' : '#f8fafc' } : { backgroundColor: assetEditorTheme === 'dark' ? '#0f172a' : '#f8fafc' }}
                            >
                              {!asset.url && <span className="absolute inset-0 text-[10px] text-[var(--text-muted)] flex items-center justify-center">Нет</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button type="button" onClick={() => cycleOverlay(1)} className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-50" disabled={currentThemeOverlayOptions.length <= 1}>›</button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Масштаб накладки</span>
                      <span className="text-[var(--text-primary)]">{overlayScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={200}
                      step={5}
                      value={overlayScale}
                      onChange={(e) => saveSettings({ ...chatSettings, chatOverlayScale: Number.parseInt(e.target.value, 10) || 100 })}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Прозрачность накладки</span>
                      <span className="text-[var(--text-primary)]">{Math.round(overlayOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(overlayOpacity * 100)}
                      onChange={(e) => {
                        const nextPercent = Number.parseInt(e.target.value, 10) || 0;
                        saveSettings({ ...chatSettings, chatOverlayOpacity: nextPercent / 100 });
                      }}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Прозрачность баблов</span>
                      <span className="text-[var(--text-primary)]">{Math.round(bubbleOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      step={1}
                      value={Math.round(bubbleOpacity * 100)}
                      onChange={(e) => {
                        const nextPercent = Number.parseInt(e.target.value, 10) || 92;
                        saveSettings({ ...chatSettings, bubbleOpacity: nextPercent / 100 });
                      }}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  </div>

                  {currentThemeBackgroundOptions.length <= 1 && currentThemeOverlayOptions.length <= 1 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Для этой темы пока нет загруженных вариантов. Положите файлы в папки chat-backgrounds/{assetEditorTheme}/backgrounds и chat-backgrounds/{assetEditorTheme}/overlays.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--border-light)] p-3 relative overflow-hidden" style={previewBackgroundStyle}>
                  {previewOverlayStyle && <div style={previewOverlayStyle} />}
                  <div className="text-xs text-[var(--text-muted)] mb-2 inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />Предпросмотр</div>
                  <div className="space-y-2 relative z-10">
                    <div className="max-w-[78%] rounded-xl px-3 py-2 text-sm border border-[var(--border-light)] text-[var(--text-primary)]" style={{ backgroundColor: hexToRgba(theme === 'dark' ? chatSettings.bubbleColorOpponent : chatSettings.bubbleColorOpponentLight, bubbleOpacity) }}>Привет! Посмотрел настройки.</div>
                    <div className="max-w-[78%] ml-auto rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: hexToRgba(theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight, bubbleOpacity), color: theme === 'dark' ? (chatSettings.bubbleTextColor || '#ffffff') : (chatSettings.bubbleTextColorLight || '#ffffff') }}>Отлично, применяю новый стиль 👍</div>
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

            <Card title="Уведомления" subtitle="Управление системными уведомлениями браузера">
              <div className="h-12 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/70 px-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-[var(--border-light)] bg-[var(--bg-glass)] flex items-center justify-center">
                  <Bell className="w-4 h-4 text-[var(--text-primary)]" />
                </div>
                <span className="flex-1 text-sm text-[var(--text-primary)]">Уведомления</span>
                <ToggleSwitch checked={notifications} onChange={setNotifications} />
              </div>
              
              {/* Статус разрешений */}
              <div className="mt-3 p-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Статус разрешений:</span>
                  <span className={`text-xs font-semibold ${
                    notificationPermission === 'granted' ? 'text-green-500' :
                    notificationPermission === 'denied' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {notificationPermission === 'granted' ? '✓ Разрешены' :
                     notificationPermission === 'denied' ? '✗ Заблокированы' :
                     '⚠ Не запрошены'}
                  </span>
                </div>
                {notificationPermission === 'denied' && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Разрешите уведомления в настройках браузера
                  </p>
                )}
                {notificationPermission === 'default' && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Нажмите на кнопку ниже для запроса разрешений
                  </p>
                )}
              </div>

              {/* Кнопка запроса разрешений */}
              {notificationPermission === 'default' && (
                <button
                  onClick={async () => {
                    try {
                      const electronRuntime = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent || '');
                      if (electronRuntime) {
                        setNotificationPermission('granted');
                        return;
                      }

                      if (typeof window !== 'undefined' && 'Notification' in window) {
                        const permission = await Notification.requestPermission();
                        setNotificationPermission(permission);
                        if (permission === 'granted') {
                          new Notification('Разрешения получены! 🎉', {
                            body: 'Теперь вы будете получать уведомления',
                            icon: '/Group 8.png',
                            tag: 'permission-granted'
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Ошибка запроса разрешений:', error);
                    }
                  }}
                  className="mt-3 w-full h-11 rounded-xl border-2 border-[var(--accent-primary)] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/80 hover:from-[var(--accent-primary)]/90 hover:to-[var(--accent-primary)]/70 transition-all px-3 text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg"
                >
                  <Bell className="w-4 h-4" />
                  Разрешить уведомления
                </button>
              )}

              {/* Кнопка тестирования */}
              {notificationPermission === 'granted' && (
                <button
                  onClick={async () => {
                    try {
                      const electronRuntime = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent || '');
                      if (typeof window !== 'undefined' && window.sharDesktop?.showNotification) {
                        await window.sharDesktop.showNotification({
                          title: 'Тестовое уведомление',
                          subtitle: 'Shar OS',
                          message: 'Кастомные уведомления работают корректно. Вы будете получать задачи, события и новые сообщения.',
                          timestamp: Date.now(),
                          url: '/account?tab=settings',
                          kind: 'system',
                        });
                      } else if (!electronRuntime && typeof window !== 'undefined' && 'Notification' in window) {
                        new Notification('Тестовое уведомление 🔔', {
                          body: 'Уведомления работают корректно! Вы будете получать напоминания о задачах, событиях и новых сообщениях.',
                          icon: '/Group 8.png',
                          badge: '/Group 8.png',
                          tag: 'test-notification',
                          requireInteraction: false,
                          silent: false
                        });

                        if (currentUser?.id) {
                          await fetch('/api/push/test', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: String(currentUser.id),
                              title: 'Push-тест для PWA',
                              body: 'Если приложение свернуто или закрыто, это уведомление покажет service worker.',
                              url: '/account?tab=settings',
                            }),
                          });
                        }
                      } else if (electronRuntime) {
                        alert('Кастомные уведомления Electron недоступны: bridge не инициализирован. Перезапустите Electron-клиент.');
                      }
                    } catch (error) {
                      console.error('Ошибка тестирования уведомлений:', error);
                      alert('Ошибка при тестировании уведомлений. Проверьте консоль для деталей.');
                    }
                  }}
                  className="mt-3 w-full h-11 rounded-xl border border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] backdrop-blur-xl transition-all px-3 text-sm font-medium text-[var(--text-primary)] flex items-center justify-center gap-2 shadow-[var(--shadow-card)]"
                >
                  <Sparkles className="w-4 h-4" />
                  Отправить тестовое уведомление
                </button>
              )}
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
